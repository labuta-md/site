-- Labuta: schema, privacy rules and storage.
-- Run once in the Supabase SQL editor (or with `supabase db push`).
--
-- Privacy model, enforced by the database itself (row level security), not only by the site:
--   * Anyone can read a pet's public card through the `public_pets` view: no owner, no chip, no private notes.
--   * A person sees their own profile and the pets they created or own.
--   * Owner names, phones and emails are readable only by moderators.
--   * Nobody can make themselves a moderator or approve their own role.

create extension if not exists pgcrypto;

create type user_role as enum ('owner', 'volunteer', 'vet', 'shelter', 'organization', 'moderator');
create type requestable_role as enum ('volunteer', 'vet', 'shelter', 'organization');
create type species as enum ('dog', 'cat');
create type pet_status as enum ('home', 'street', 'foster', 'adoption', 'lost');
create type pet_sex as enum ('male', 'female', 'unknown');

-- Profiles ------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role user_role not null default 'owner',
  requested_role requestable_role,
  display_name text check (char_length(display_name) <= 100),
  org_name text check (char_length(org_name) <= 120),
  city text check (char_length(city) <= 80),
  phone text check (char_length(phone) <= 32),
  allow_phone_contact boolean not null default false,
  telegram_chat_id text,
  locale text not null default 'ro' check (locale in ('ro', 'ru', 'en')),
  created_at timestamptz not null default now()
);

create or replace function is_moderator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'moderator');
$$;

create or replace function current_role_is(roles user_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = any(roles));
$$;

-- True for the site's server (service role) and for admins in the SQL editor, which bypass the guards below.
create or replace function is_trusted_caller() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', 'service_role') = 'service_role';
$$;

-- New sign-ups get a profile automatically.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, locale)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'locale', 'ro'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- People may edit their own profile, but never their role, email or Telegram binding.
create or replace function guard_profile_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if is_moderator() or is_trusted_caller() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.email is distinct from old.email
     or new.telegram_chat_id is distinct from old.telegram_chat_id and new.telegram_chat_id is not null then
    raise exception 'not allowed';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on profiles
  for each row execute function guard_profile_update();

alter table profiles enable row level security;

create policy "own profile: read" on profiles for select using (id = auth.uid() or is_moderator());
create policy "own profile: update" on profiles for update using (id = auth.uid() or is_moderator());

-- Pets ----------------------------------------------------------------------

create table pets (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  created_by uuid not null references profiles on delete cascade,
  owner_id uuid references profiles on delete set null,
  species species not null,
  name text check (char_length(name) <= 60),
  status pet_status not null default 'home',
  sex pet_sex not null default 'unknown',
  birth_year int check (birth_year between 1990 and 2100),
  color text check (char_length(color) <= 80),
  breed text check (char_length(breed) <= 80),
  chip_number text check (char_length(chip_number) <= 32),
  ear_tag text check (char_length(ear_tag) <= 32),
  sterilized boolean,
  rabies_date date,
  special_marks text check (char_length(special_marks) <= 500),
  finder_notes text check (char_length(finder_notes) <= 500),
  private_notes text check (char_length(private_notes) <= 2000),
  city text check (char_length(city) <= 80),
  area text check (char_length(area) <= 160),
  photo_url text,
  lost_since timestamptz,
  lost_area text check (char_length(lost_area) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pets_created_by on pets (created_by);
create index pets_owner on pets (owner_id);
create index pets_status on pets (status);
create index pets_chip on pets (regexp_replace(chip_number, '\D', '', 'g'));

-- Street, foster and adoption animals may only be registered by caretakers.
create or replace function guard_pet_write() returns trigger
language plpgsql set search_path = public as $$
begin
  if is_trusted_caller() then
    new.updated_at = now();
    return new;
  end if;
  if new.status in ('street', 'foster', 'adoption')
     and not current_role_is(array['volunteer', 'vet', 'shelter', 'organization', 'moderator']::user_role[]) then
    raise exception 'caretaker role needed';
  end if;
  if tg_op = 'UPDATE' and new.created_by is distinct from old.created_by and not is_moderator() then
    raise exception 'not allowed';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger pets_guard before insert or update on pets
  for each row execute function guard_pet_write();

alter table pets enable row level security;

create policy "pets: read own" on pets for select
  using (created_by = auth.uid() or owner_id = auth.uid() or is_moderator());
create policy "pets: insert own" on pets for insert
  with check (created_by = auth.uid() and (owner_id is null or owner_id = auth.uid()));
create policy "pets: update own" on pets for update
  using (created_by = auth.uid() or owner_id = auth.uid() or is_moderator())
  with check (owner_id is null or owner_id = auth.uid() or is_moderator() or created_by = auth.uid());
create policy "pets: delete own" on pets for delete
  using (created_by = auth.uid() or owner_id = auth.uid() or is_moderator());

-- The public card. Runs with the view owner's rights so anonymous visitors can read
-- exactly these columns and nothing else.
create view public_pets with (security_invoker = false) as
  select p.id, p.public_code, p.species, p.name, p.status, p.sex, p.birth_year, p.color, p.breed,
         p.ear_tag, p.sterilized, p.rabies_date, p.special_marks, p.finder_notes, p.city, p.area,
         p.photo_url, p.lost_since, p.lost_area, p.created_at, p.updated_at,
         case when c.role in ('vet', 'shelter', 'organization') then c.org_name end as registered_by_org
  from pets p join profiles c on c.id = p.created_by;

grant select on public_pets to anon, authenticated;

-- Vets, shelters, organizations and moderators can find an animal by microchip.
create or replace function find_code_by_chip(chip text) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not current_role_is(array['vet', 'shelter', 'organization', 'moderator']::user_role[]) then
    raise exception 'not allowed';
  end if;
  return (select public_code from pets
          where regexp_replace(chip_number, '\D', '', 'g') = regexp_replace(chip, '\D', '', 'g')
          limit 1);
end;
$$;

-- Messages from people who scanned a tag -------------------------------------
-- Written only by the site's server (service role) so it can rate-limit and notify.

create table finder_messages (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  message text not null check (char_length(message) between 1 and 1000),
  finder_name text check (char_length(finder_name) <= 100),
  finder_phone text check (char_length(finder_phone) <= 32),
  location_text text check (char_length(location_text) <= 200),
  ip_hash text not null,
  delivered_email boolean not null default false,
  delivered_telegram boolean not null default false,
  created_at timestamptz not null default now()
);

create index finder_messages_pet on finder_messages (pet_id);
create index finder_messages_ip on finder_messages (ip_hash, created_at);

alter table finder_messages enable row level security;

create policy "messages: pet's people read" on finder_messages for select using (
  is_moderator() or exists (
    select 1 from pets p where p.id = pet_id and (p.created_by = auth.uid() or p.owner_id = auth.uid())
  )
);

-- Lost / found reports for animals without a tag -----------------------------

create table reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('lost', 'found')),
  species species not null,
  description text not null check (char_length(description) between 1 and 1000),
  city text check (char_length(city) <= 80),
  area text check (char_length(area) <= 160),
  photo_url text,
  seen_on date,
  reporter_id uuid references profiles on delete set null,
  reporter_contact text check (char_length(reporter_contact) <= 100),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

create policy "reports: moderators read all" on reports for select using (is_moderator() or reporter_id = auth.uid());
create policy "reports: moderators update" on reports for update using (is_moderator());

create view public_reports with (security_invoker = false) as
  select id, kind, species, description, city, area, photo_url, seen_on, status, created_at
  from reports where status = 'open';

grant select on public_reports to anon, authenticated;

-- Moderator access to owner contacts is always logged ------------------------

create table contact_access (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  moderator_id uuid not null references profiles,
  reason text not null check (char_length(reason) between 3 and 300),
  created_at timestamptz not null default now()
);

alter table contact_access enable row level security;
create policy "contact log: moderators read" on contact_access for select using (is_moderator());
create policy "contact log: moderators write own" on contact_access for insert
  with check (is_moderator() and moderator_id = auth.uid());

-- Telegram linking -----------------------------------------------------------

create table telegram_link_tokens (
  token text primary key,
  user_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now()
);

alter table telegram_link_tokens enable row level security;
create policy "tg tokens: own" on telegram_link_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Photos ----------------------------------------------------------------------
-- Public bucket: photos are meant to be seen on the public card.
-- Each person can only upload into a folder named after their own id.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "photos: upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text);

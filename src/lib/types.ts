export const ROLES = [
  "owner",
  "volunteer",
  "vet",
  "shelter",
  "organization",
  "moderator",
] as const;
export type Role = (typeof ROLES)[number];

/** Roles a person can ask for when signing up. Moderator is granted, never requested. */
export const REQUESTABLE_ROLES = ["volunteer", "vet", "shelter", "organization"] as const;
export type RequestableRole = (typeof REQUESTABLE_ROLES)[number];

/** Roles whose name is shown publicly on the animals they register. */
export const ORG_ROLES: Role[] = ["vet", "shelter", "organization"];

/** Roles allowed to register animals that have no owner (street, foster, adoption). */
export const CARETAKER_ROLES: Role[] = ["volunteer", "vet", "shelter", "organization", "moderator"];

export const SPECIES = ["dog", "cat"] as const;
export type Species = (typeof SPECIES)[number];

export const PET_STATUSES = ["home", "street", "foster", "adoption", "lost"] as const;
export type PetStatus = (typeof PET_STATUSES)[number];

export const SEXES = ["male", "female", "unknown"] as const;
export type Sex = (typeof SEXES)[number];

export interface Profile {
  id: string;
  email: string;
  role: Role;
  requested_role: RequestableRole | null;
  /** Private: the person's own name. Only the person and moderators see it. */
  display_name: string | null;
  /** Public for vets, shelters and organizations once approved. */
  org_name: string | null;
  city: string | null;
  /** Private: only moderators see it, and only release it with consent. */
  phone: string | null;
  allow_phone_contact: boolean;
  telegram_chat_id: string | null;
  /** Language for notifications sent to this person. */
  locale: string;
  created_at: string;
}

export interface Pet {
  id: string;
  public_code: string;
  created_by: string;
  owner_id: string | null;
  species: Species;
  name: string | null;
  status: PetStatus;
  sex: Sex;
  birth_year: number | null;
  color: string | null;
  breed: string | null;
  chip_number: string | null;
  ear_tag: string | null;
  sterilized: boolean | null;
  rabies_date: string | null;
  special_marks: string | null;
  /** Shown to whoever scans the tag: "needs medication", "afraid of cars". */
  finder_notes: string | null;
  /** Never shown publicly. */
  private_notes: string | null;
  city: string | null;
  area: string | null;
  photo_url: string | null;
  lost_since: string | null;
  lost_area: string | null;
  created_at: string;
  updated_at: string;
}

/** What anyone may see. No owner, no chip number, no private notes. */
export type PublicPet = Omit<Pet, "created_by" | "owner_id" | "chip_number" | "private_notes"> & {
  registered_by_org: string | null;
};

export type PetInput = Omit<
  Pet,
  "id" | "public_code" | "created_by" | "owner_id" | "photo_url" | "created_at" | "updated_at"
> & { photo?: File | null; remove_photo?: boolean };

export interface FinderMessage {
  id: string;
  pet_id: string;
  message: string;
  finder_name: string | null;
  finder_phone: string | null;
  location_text: string | null;
  created_at: string;
  delivered_email: boolean;
  delivered_telegram: boolean;
}

export type FinderMessageInput = Pick<
  FinderMessage,
  "message" | "finder_name" | "finder_phone" | "location_text"
>;

export interface Report {
  id: string;
  kind: "lost" | "found";
  species: Species;
  description: string;
  city: string | null;
  area: string | null;
  photo_url: string | null;
  seen_on: string | null;
  reporter_id: string | null;
  /** Private: only moderators see it. */
  reporter_contact: string | null;
  status: "open" | "resolved";
  created_at: string;
}

export type PublicReport = Omit<Report, "reporter_id" | "reporter_contact">;

export type ReportInput = Pick<
  Report,
  "kind" | "species" | "description" | "city" | "area" | "seen_on" | "reporter_contact"
> & { photo?: File | null };

export interface ContactAccess {
  id: string;
  pet_id: string;
  moderator_id: string;
  reason: string;
  created_at: string;
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    "display_name" | "org_name" | "city" | "phone" | "allow_phone_contact" | "requested_role" | "locale"
  >
>;

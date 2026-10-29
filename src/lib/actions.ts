"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser, DEMO_COOKIE } from "./auth";
import { isLocale } from "./i18n/config";
import { notifyOwner, telegramConfigured } from "./notify";
import { getStore, PermissionError } from "./store";
import { demoSignIn } from "./store/demo";
import { supabaseConfigured, userClient } from "./supabase/clients";
import {
  PET_STATUSES,
  REQUESTABLE_ROLES,
  ROLES,
  SEXES,
  SPECIES,
  type PetInput,
  type PetStatus,
  type Profile,
  type RequestableRole,
  type Role,
  type Species,
} from "./types";

export type FormState = { ok?: boolean; error?: string; message?: string; data?: unknown } | null;

// ---------- helpers ----------

function str(form: FormData, key: string, max = 500): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t === "" ? null : t;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function bool(form: FormData, key: string): boolean | null {
  const v = form.get(key);
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

const MAX_PHOTO = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

function photo(form: FormData, key = "photo"): File | null | "too_big" | "wrong_type" {
  const f = form.get(key);
  if (!(f instanceof File) || f.size === 0) return null;
  if (f.size > MAX_PHOTO) return "too_big";
  if (!PHOTO_TYPES.includes(f.type)) return "wrong_type";
  return f;
}

function safeLang(lang: string) {
  return isLocale(lang) ? lang : "ro";
}

async function mustUser(lang: string): Promise<Profile> {
  const user = await currentUser();
  if (!user) redirect(`/${safeLang(lang)}/login`);
  return user;
}

async function ipHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256")
    .update(`${process.env.IP_HASH_SALT || "labuta"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

// ---------- sign-in ----------

export async function signIn(lang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const l = safeLang(lang);
  const email = str(form, "email", 200)?.toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "invalidEmail" };

  if (!supabaseConfigured()) {
    const id = await demoSignIn(email, l);
    (await cookies()).set(DEMO_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    redirect(`/${l}/me`);
  }

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const { error } = await (await userClient()).auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/${l}/me`, data: { locale: l } },
  });
  if (error) return { error: "generic" };
  return { ok: true, message: email };
}

export async function demoSignInAs(lang: string, form: FormData) {
  if (supabaseConfigured()) return;
  const id = str(form, "user_id", 64);
  if (id) (await cookies()).set(DEMO_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  redirect(`/${safeLang(lang)}/me`);
}

export async function signOut(lang: string) {
  if (supabaseConfigured()) await (await userClient()).auth.signOut();
  else (await cookies()).delete(DEMO_COOKIE);
  redirect(`/${safeLang(lang)}`);
}

// ---------- pets ----------

function readPet(form: FormData): PetInput | "too_big" | "wrong_type" {
  const p = photo(form);
  if (p === "too_big" || p === "wrong_type") return p;
  const year = Number(str(form, "birth_year", 4));
  const thisYear = new Date().getFullYear();
  const rabies = str(form, "rabies_date", 10);
  return {
    species: oneOf<Species>(str(form, "species"), SPECIES, "dog"),
    name: str(form, "name", 60),
    status: oneOf<PetStatus>(str(form, "status"), PET_STATUSES, "home"),
    sex: oneOf(str(form, "sex"), SEXES, "unknown"),
    birth_year: Number.isInteger(year) && year >= 1990 && year <= thisYear ? year : null,
    color: str(form, "color", 80),
    breed: str(form, "breed", 80),
    chip_number: str(form, "chip_number", 32),
    ear_tag: str(form, "ear_tag", 32),
    sterilized: bool(form, "sterilized"),
    rabies_date: rabies && /^\d{4}-\d{2}-\d{2}$/.test(rabies) ? rabies : null,
    special_marks: str(form, "special_marks", 500),
    finder_notes: str(form, "finder_notes", 500),
    private_notes: str(form, "private_notes", 2000),
    city: str(form, "city", 80),
    area: str(form, "area", 160),
    lost_area: str(form, "lost_area", 160),
    lost_since: null,
    photo: p,
    remove_photo: form.get("remove_photo") === "on",
  };
}

export async function savePet(lang: string, petId: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const l = safeLang(lang);
  const user = await mustUser(l);
  const input = readPet(form);
  if (input === "too_big") return { error: "photoTooBig" };
  if (input === "wrong_type") return { error: "photoWrongType" };
  let id: string;
  try {
    const store = getStore();
    const pet = petId ? await store.updatePet(user.id, petId, input) : await store.createPet(user.id, input);
    id = pet.id;
  } catch (err) {
    if (err instanceof PermissionError) return { error: "forbidden" };
    console.error("[savePet]", err);
    return { error: "generic" };
  }
  revalidatePath(`/${l}/me`);
  redirect(`/${l}/pets/${id}`);
}

export async function deletePet(lang: string, petId: string) {
  const l = safeLang(lang);
  const user = await mustUser(l);
  await getStore().deletePet(user.id, petId);
  revalidatePath(`/${l}/me`);
  redirect(`/${l}/me`);
}

/** Quick switch from the pet page: lost ↔ back home. */
export async function setLost(lang: string, petId: string, lost: boolean) {
  const l = safeLang(lang);
  const user = await mustUser(l);
  const store = getStore();
  const pet = await store.getEditablePet(user.id, petId);
  if (!pet) redirect(`/${l}/me`);
  const back: PetStatus = pet.owner_id ? "home" : "street";
  await store.updatePet(user.id, petId, { ...pet, status: lost ? "lost" : back, photo: null, remove_photo: false });
  revalidatePath(`/${l}/pets/${petId}`);
  redirect(`/${l}/pets/${petId}`);
}

export async function searchChip(lang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const l = safeLang(lang);
  const user = await mustUser(l);
  const chip = str(form, "chip", 32);
  if (!chip) return { error: "chipNotFound" };
  try {
    const code = await getStore().findCodeByChip(user.id, chip);
    if (!code) return { error: "chipNotFound" };
    redirect(`/${l}/p/${code}`);
  } catch (err) {
    if (err instanceof PermissionError) return { error: "forbidden" };
    throw err;
  }
}

// ---------- profile ----------

export async function saveProfile(lang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const l = safeLang(lang);
  const user = await mustUser(l);
  const requested = str(form, "requested_role");
  const locale = str(form, "locale");
  try {
    await getStore().updateOwnProfile(user.id, {
      display_name: str(form, "display_name", 100),
      org_name: str(form, "org_name", 120),
      city: str(form, "city", 80),
      phone: str(form, "phone", 32),
      allow_phone_contact: form.get("allow_phone_contact") === "on",
      requested_role:
        requested && requested !== user.role && (REQUESTABLE_ROLES as readonly string[]).includes(requested)
          ? (requested as RequestableRole)
          : null,
      locale: isLocale(locale) ? locale : user.locale,
    });
  } catch (err) {
    console.error("[saveProfile]", err);
    return { error: "generic" };
  }
  revalidatePath(`/${l}/me`);
  return { ok: true };
}

export async function connectTelegram(lang: string) {
  const l = safeLang(lang);
  const user = await mustUser(l);
  if (!telegramConfigured()) redirect(`/${l}/me/profile`);
  const token = await getStore().createTelegramLinkToken(user.id);
  redirect(`https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${token}`);
}

export async function disconnectTelegram(lang: string) {
  const l = safeLang(lang);
  const user = await mustUser(l);
  await getStore().unbindTelegram(user.id);
  revalidatePath(`/${l}/me/profile`);
}

// ---------- finder message ----------

export async function sendFinderMessage(code: string, _prev: FormState, form: FormData): Promise<FormState> {
  if (str(form, "website")) return { ok: true }; // honeypot: bots fill every field
  const message = str(form, "message", 1000);
  if (!message) return { error: "empty" };
  const store = getStore();
  const result = await store.createFinderMessage(
    code,
    {
      message,
      finder_name: str(form, "finder_name", 100),
      finder_phone: str(form, "finder_phone", 32),
      location_text: str(form, "location_text", 200),
    },
    await ipHash(),
  );
  if (result === "not_found") return { error: "generic" };
  if (result === "rate_limited") return { error: "rateLimited" };
  const delivered = await notifyOwner(result.targets, result.message);
  await store.markDelivered(result.message.id, delivered);
  return { ok: true, message: delivered.email || delivered.telegram ? "sent" : "sentNoChannel" };
}

// ---------- lost / found reports ----------

export async function createReport(lang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const l = safeLang(lang);
  if (str(form, "website")) return { ok: true };
  const description = str(form, "description", 1000);
  if (!description) return { error: "generic" };
  const p = photo(form);
  if (p === "too_big") return { error: "photoTooBig" };
  if (p === "wrong_type") return { error: "photoWrongType" };
  const seen = str(form, "seen_on", 10);
  const user = await currentUser();
  try {
    await getStore().createReport(user?.id ?? null, {
      kind: str(form, "kind") === "lost" ? "lost" : "found",
      species: oneOf<Species>(str(form, "species"), SPECIES, "dog"),
      description,
      city: str(form, "city", 80),
      area: str(form, "area", 160),
      seen_on: seen && /^\d{4}-\d{2}-\d{2}$/.test(seen) ? seen : null,
      reporter_contact: str(form, "reporter_contact", 100),
      photo: p,
    });
  } catch (err) {
    console.error("[createReport]", err);
    return { error: "generic" };
  }
  revalidatePath(`/${l}/lost-found`);
  return { ok: true };
}

// ---------- moderation ----------

async function mustMod(lang: string) {
  const user = await mustUser(lang);
  if (user.role !== "moderator") throw new PermissionError();
  return user;
}

export async function decideRole(lang: string, userId: string, approve: boolean) {
  const mod = await mustMod(lang);
  await getStore().admin.decideRole(mod.id, userId, approve);
  revalidatePath(`/${safeLang(lang)}/admin`);
}

export async function setRole(lang: string, userId: string, form: FormData) {
  const mod = await mustMod(lang);
  const role = oneOf<Role>(str(form, "role"), ROLES, "owner");
  if (userId === mod.id && role !== "moderator") return; // don't lock yourself out
  await getStore().admin.setRole(mod.id, userId, role);
  revalidatePath(`/${safeLang(lang)}/admin`);
}

export async function setReportStatus(lang: string, reportId: string, status: "open" | "resolved") {
  const mod = await mustMod(lang);
  await getStore().admin.setReportStatus(mod.id, reportId, status);
  revalidatePath(`/${safeLang(lang)}/admin`);
  revalidatePath(`/${safeLang(lang)}/lost-found`);
}

export async function showOwnerContact(lang: string, petId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const mod = await mustMod(lang);
  const reason = str(form, "reason", 300);
  if (!reason || reason.length < 3) return { error: "reason" };
  const { owner, creator } = await getStore().admin.getOwnerContact(mod.id, petId, reason);
  const pick = (p: Profile | null) =>
    p && {
      role: p.role,
      name: p.display_name,
      org: p.org_name,
      email: p.email,
      city: p.city,
      phone: p.phone,
      allow_phone_contact: p.allow_phone_contact,
    };
  return { ok: true, data: { owner: pick(owner), creator: creator && creator.id !== owner?.id ? pick(creator) : null } };
}

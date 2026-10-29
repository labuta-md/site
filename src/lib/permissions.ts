import { CARETAKER_ROLES, ORG_ROLES, type Pet, type Profile } from "./types";

export function isModerator(p: Pick<Profile, "role"> | null | undefined): boolean {
  return p?.role === "moderator";
}

export function canEditPet(user: Pick<Profile, "id" | "role">, pet: Pick<Pet, "created_by" | "owner_id">) {
  return isModerator(user) || pet.created_by === user.id || pet.owner_id === user.id;
}

/** Owners register their own animals; caretakers can also register animals without an owner. */
export function canRegisterWithoutOwner(user: Pick<Profile, "role">) {
  return CARETAKER_ROLES.includes(user.role);
}

export function canSearchChip(user: Pick<Profile, "role">) {
  return ORG_ROLES.includes(user.role) || isModerator(user);
}

export function publicOrgName(creator: Pick<Profile, "role" | "org_name"> | null | undefined): string | null {
  if (!creator) return null;
  return ORG_ROLES.includes(creator.role) && creator.org_name ? creator.org_name : null;
}

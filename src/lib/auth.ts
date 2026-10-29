import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStore } from "./store";
import { supabaseConfigured, userClient } from "./supabase/clients";
import type { Profile } from "./types";

export const DEMO_COOKIE = "labuta_demo_user";

export async function currentUser(): Promise<Profile | null> {
  let id: string | undefined;
  if (supabaseConfigured()) {
    const { data } = await (await userClient()).auth.getUser();
    id = data.user?.id;
  } else {
    id = (await cookies()).get(DEMO_COOKIE)?.value;
  }
  if (!id) return null;
  return getStore().getProfile(id);
}

export async function requireUser(lang: string): Promise<Profile> {
  const user = await currentUser();
  if (!user) redirect(`/${lang}/login`);
  return user;
}

export async function requireModerator(lang: string): Promise<Profile> {
  const user = await requireUser(lang);
  if (user.role !== "moderator") redirect(`/${lang}/me`);
  return user;
}

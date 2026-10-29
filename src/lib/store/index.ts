import "server-only";
import { supabaseConfigured } from "../supabase/clients";
import { createDemoStore } from "./demo";
import type { Store } from "./store";
import { createSupabaseStore } from "./supabase";

let instance: Store | null = null;

/** Supabase when its keys are set, otherwise the local demo store. */
export function getStore(): Store {
  if (!instance) instance = supabaseConfigured() ? createSupabaseStore() : createDemoStore();
  return instance;
}

export { PermissionError } from "./store";

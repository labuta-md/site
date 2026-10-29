import "server-only";
import { randomUUID } from "crypto";
import { newPublicCode, newToken, normalizeCode } from "../codes";
import { serviceClient, userClient } from "../supabase/clients";
import type { ContactAccess, FinderMessage, Pet, PetInput, Profile, PublicPet, PublicReport, Report } from "../types";
import { PermissionError, type OwnerTargets, type Store } from "./store";

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === "42501" || /not allowed|caretaker/.test(res.error.message)) {
      throw new PermissionError(res.error.message);
    }
    throw new Error(res.error.message);
  }
  return res.data;
}

function petRow(input: PetInput) {
  const { photo, remove_photo, ...fields } = input;
  void photo;
  void remove_photo;
  return fields;
}

async function requireMod(userId: string) {
  const db = await userClient();
  const { data } = await db.from("profiles").select("role").eq("id", userId).single();
  if (data?.role !== "moderator") throw new PermissionError();
  return db;
}

export function createSupabaseStore(): Store {
  const store: Store = {
    mode: "supabase",

    async getProfile(userId) {
      const db = await userClient();
      const { data } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
      return (data as Profile) ?? null;
    },

    async updateOwnProfile(userId, patch) {
      const db = await userClient();
      check(await db.from("profiles").update(patch).eq("id", userId));
    },

    async listPetsForUser(userId) {
      const db = await userClient();
      const rows = check(
        await db
          .from("pets")
          .select("*")
          .or(`created_by.eq.${userId},owner_id.eq.${userId}`)
          .order("updated_at", { ascending: false }),
      );
      return rows as Pet[];
    },

    async getEditablePet(_userId, petId) {
      // Row level security only returns pets this user may edit.
      const db = await userClient();
      const { data } = await db.from("pets").select("*").eq("id", petId).maybeSingle();
      return (data as Pet) ?? null;
    },

    async createPet(userId, input) {
      const db = await userClient();
      const owned = input.status === "home" || input.status === "lost";
      const photo_url = input.photo ? await store.uploadPhoto(userId, input.photo) : null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await db
          .from("pets")
          .insert({
            ...petRow(input),
            public_code: newPublicCode(),
            created_by: userId,
            owner_id: owned ? userId : null,
            photo_url,
            lost_since: input.status === "lost" ? new Date().toISOString() : null,
          })
          .select("*")
          .single();
        if (res.error?.code === "23505") continue; // code collision, try another
        return check(res) as Pet;
      }
      throw new Error("could not allocate a code");
    },

    async updatePet(userId, petId, input) {
      const db = await userClient();
      const current = await store.getEditablePet(userId, petId);
      if (!current) throw new PermissionError();
      const patch: Record<string, unknown> = {
        ...petRow(input),
        owner_id:
          input.status === "home" ? (current.owner_id ?? userId) : input.status === "lost" ? current.owner_id : null,
        lost_since: input.status === "lost" ? (current.lost_since ?? new Date().toISOString()) : null,
      };
      if (input.status !== "lost") patch.lost_area = null;
      if (input.photo) patch.photo_url = await store.uploadPhoto(userId, input.photo);
      else if (input.remove_photo) patch.photo_url = null;
      return check(await db.from("pets").update(patch).eq("id", petId).select("*").single()) as Pet;
    },

    async deletePet(_userId, petId) {
      const db = await userClient();
      const res = check(await db.from("pets").delete().eq("id", petId).select("id"));
      if (!res?.length) throw new PermissionError();
    },

    async getPublicPet(code) {
      const db = await userClient();
      const { data } = await db.from("public_pets").select("*").eq("public_code", normalizeCode(code)).maybeSingle();
      return (data as PublicPet) ?? null;
    },

    async findCodeByChip(_userId, chip) {
      const db = await userClient();
      return check(await db.rpc("find_code_by_chip", { chip })) as string | null;
    },

    async listLost() {
      const db = await userClient();
      const [pets, reports] = await Promise.all([
        db.from("public_pets").select("*").in("status", ["lost", "adoption"]).order("updated_at", { ascending: false }).limit(100),
        db.from("public_reports").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      return { pets: (check(pets) ?? []) as PublicPet[], reports: (check(reports) ?? []) as PublicReport[] };
    },

    async createReport(userId, input) {
      const { photo, ...fields } = input;
      const photo_url = photo ? await uploadAs(serviceClient(), userId ?? "anonymous", photo) : null;
      const res = await serviceClient()
        .from("reports")
        .insert({ ...fields, photo_url, reporter_id: userId })
        .select("*")
        .single();
      return check(res) as Report;
    },

    async createFinderMessage(code, input, ipHash) {
      const admin = serviceClient();
      const { data: pet } = await admin
        .from("pets")
        .select("id, name, public_code, owner_id, created_by")
        .eq("public_code", normalizeCode(code))
        .maybeSingle();
      if (!pet) return "not_found";
      const since = new Date(Date.now() - 3600000).toISOString();
      const { count } = await admin
        .from("finder_messages")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);
      if ((count ?? 0) >= 5) return "rate_limited";
      const message = check(
        await admin
          .from("finder_messages")
          .insert({ ...input, pet_id: pet.id, ip_hash: ipHash })
          .select("id, pet_id, message, finder_name, finder_phone, location_text, created_at, delivered_email, delivered_telegram")
          .single(),
      ) as FinderMessage;
      const { data: recipient } = await admin
        .from("profiles")
        .select("email, telegram_chat_id, locale")
        .eq("id", pet.owner_id ?? pet.created_by)
        .maybeSingle();
      const targets: OwnerTargets = {
        petName: pet.name,
        publicCode: pet.public_code,
        email: recipient?.email ?? null,
        telegramChatId: recipient?.telegram_chat_id ?? null,
        locale: recipient?.locale ?? "ro",
      };
      return { message, targets };
    },

    async markDelivered(messageId, channels) {
      await serviceClient()
        .from("finder_messages")
        .update({ delivered_email: channels.email, delivered_telegram: channels.telegram })
        .eq("id", messageId);
    },

    async listMessagesForUser() {
      const db = await userClient();
      const rows = check(
        await db
          .from("finder_messages")
          .select("id, pet_id, message, finder_name, finder_phone, location_text, created_at, delivered_email, delivered_telegram, pets(name, public_code)")
          .order("created_at", { ascending: false })
          .limit(50),
      ) as unknown as (Record<string, unknown> & { pets: { name: string | null; public_code: string } })[];
      return rows.map(({ pets, ...m }) => ({
        ...(m as unknown as FinderMessage),
        pet_name: pets?.name ?? null,
        pet_code: pets?.public_code ?? "",
      }));
    },

    async createTelegramLinkToken(userId) {
      const db = await userClient();
      const token = newToken();
      await db.from("telegram_link_tokens").delete().eq("user_id", userId);
      check(await db.from("telegram_link_tokens").insert({ token, user_id: userId }));
      return token;
    },

    async bindTelegram(token, chatId) {
      const admin = serviceClient();
      const { data } = await admin.from("telegram_link_tokens").select("user_id").eq("token", token).maybeSingle();
      if (!data) return false;
      check(await admin.from("profiles").update({ telegram_chat_id: chatId }).eq("id", data.user_id));
      await admin.from("telegram_link_tokens").delete().eq("token", token);
      return true;
    },

    async unbindTelegram(userId) {
      const db = await userClient();
      check(await db.from("profiles").update({ telegram_chat_id: null }).eq("id", userId));
    },

    async uploadPhoto(userId, file) {
      return uploadAs(await userClient(), userId, file);
    },

    admin: {
      async listPets(modId) {
        const db = await requireMod(modId);
        return check(await db.from("pets").select("*").order("created_at", { ascending: false }).limit(500)) as Pet[];
      },
      async listReports(modId) {
        const db = await requireMod(modId);
        return check(await db.from("reports").select("*").order("created_at", { ascending: false }).limit(500)) as Report[];
      },
      async setReportStatus(modId, reportId, status) {
        const db = await requireMod(modId);
        check(await db.from("reports").update({ status }).eq("id", reportId));
      },
      async listRoleRequests(modId) {
        const db = await requireMod(modId);
        return check(await db.from("profiles").select("*").not("requested_role", "is", null)) as Profile[];
      },
      async decideRole(modId, userId, approve) {
        const db = await requireMod(modId);
        const { data } = await db.from("profiles").select("requested_role").eq("id", userId).single();
        if (!data?.requested_role) return;
        const patch: Record<string, unknown> = { requested_role: null };
        if (approve) patch.role = data.requested_role;
        check(await db.from("profiles").update(patch).eq("id", userId));
      },
      async setRole(modId, userId, role) {
        const db = await requireMod(modId);
        check(await db.from("profiles").update({ role }).eq("id", userId));
      },
      async listUsers(modId) {
        const db = await requireMod(modId);
        return check(await db.from("profiles").select("*").order("created_at", { ascending: false }).limit(500)) as Profile[];
      },
      async getOwnerContact(modId, petId, reason) {
        const db = await requireMod(modId);
        check(await db.from("contact_access").insert({ pet_id: petId, moderator_id: modId, reason }));
        const { data: p } = await db.from("pets").select("owner_id, created_by").eq("id", petId).single();
        if (!p) return { owner: null, creator: null };
        const ids = [p.owner_id, p.created_by].filter(Boolean);
        const people = (check(await db.from("profiles").select("*").in("id", ids)) ?? []) as Profile[];
        return {
          owner: people.find((x) => x.id === p.owner_id) ?? null,
          creator: people.find((x) => x.id === p.created_by) ?? null,
        };
      },
      async listContactAccess(modId) {
        const db = await requireMod(modId);
        return (check(await db.from("contact_access").select("*").order("created_at", { ascending: false }).limit(200)) ??
          []) as ContactAccess[];
      },
    },
  };
  return store;
}

async function uploadAs(db: Awaited<ReturnType<typeof userClient>>, folder: string, file: File): Promise<string> {
  const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${randomUUID()}.${ext}`;
  check(await db.storage.from("pet-photos").upload(path, file, { contentType: file.type, upsert: false }));
  return db.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;
}

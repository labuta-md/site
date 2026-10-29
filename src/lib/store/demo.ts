import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { newPublicCode, newToken, normalizeCode } from "../codes";
import { canEditPet, canRegisterWithoutOwner, canSearchChip, isModerator, publicOrgName } from "../permissions";
import type {
  ContactAccess,
  FinderMessage,
  Pet,
  PetInput,
  Profile,
  PublicPet,
  Report,
} from "../types";
import { PermissionError, type OwnerTargets, type Store } from "./store";

/**
 * A file-backed store for trying the site without Supabase. Not for real data:
 * there is no real sign-in, and anyone can pick a demo user on the login page.
 */

interface DemoData {
  profiles: Profile[];
  pets: Pet[];
  messages: (FinderMessage & { ip_hash: string })[];
  reports: Report[];
  contactAccess: ContactAccess[];
  telegramTokens: { token: string; user_id: string }[];
}

function dataDir() {
  // Hosting platforms only allow writing to /tmp; demo data there resets now and then, which is fine for a demo.
  return process.env.DEMO_DATA_DIR || (process.env.VERCEL ? "/tmp/labuta-demo" : path.join(process.cwd(), ".data"));
}

export const DEMO_UPLOAD_DIR = () => path.join(dataDir(), "uploads");

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function profile(p: Partial<Profile> & Pick<Profile, "id" | "email" | "role">): Profile {
  return {
    requested_role: null,
    display_name: null,
    org_name: null,
    city: "Chișinău",
    phone: null,
    allow_phone_contact: false,
    telegram_chat_id: null,
    locale: "ro",
    created_at: daysAgo(30),
    ...p,
  };
}

function pet(p: Partial<Pet> & Pick<Pet, "id" | "created_by" | "species" | "name" | "status">): Pet {
  return {
    public_code: newPublicCode(),
    owner_id: null,
    sex: "unknown",
    birth_year: null,
    color: null,
    breed: null,
    chip_number: null,
    ear_tag: null,
    sterilized: null,
    rabies_date: null,
    special_marks: null,
    finder_notes: null,
    private_notes: null,
    city: "Chișinău",
    area: null,
    photo_url: null,
    lost_since: null,
    lost_area: null,
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
    ...p,
  };
}

export const DEMO_USERS = {
  moderator: "00000000-0000-4000-8000-000000000001",
  volunteer: "00000000-0000-4000-8000-000000000002",
  owner: "00000000-0000-4000-8000-000000000003",
  shelter: "00000000-0000-4000-8000-000000000004",
} as const;

function seed(): DemoData {
  const u = DEMO_USERS;
  return {
    profiles: [
      profile({ id: u.moderator, email: "moderator@demo.labuta.md", role: "moderator", display_name: "Moderator" }),
      profile({ id: u.volunteer, email: "voluntar@demo.labuta.md", role: "volunteer", display_name: "Ana", phone: "+373 60 000 001" }),
      profile({
        id: u.owner,
        email: "stapan@demo.labuta.md",
        role: "owner",
        display_name: "Ion",
        phone: "+373 69 000 002",
        allow_phone_contact: true,
        locale: "ru",
      }),
      profile({ id: u.shelter, email: "adapost@demo.labuta.md", role: "shelter", org_name: "Adăpostul Speranța", city: "Ialoveni" }),
      profile({
        id: "00000000-0000-4000-8000-000000000005",
        email: "clinica@demo.labuta.md",
        role: "owner",
        requested_role: "vet",
        org_name: "Clinica Vet Botanica",
      }),
    ],
    pets: [
      pet({
        id: randomUUID(),
        public_code: "BOB1K23",
        created_by: u.owner,
        owner_id: u.owner,
        species: "dog",
        name: "Bobik",
        status: "home",
        sex: "male",
        birth_year: 2021,
        color: "roșcat cu alb",
        breed: "metis",
        chip_number: "498100000000123",
        sterilized: true,
        rabies_date: "2026-03-14",
        finder_notes: "Se teme de mașini. Nu-l urmăriți, chemați-l pe nume.",
        area: "Botanica",
      }),
      pet({
        id: randomUUID(),
        public_code: "MURKA77",
        created_by: u.owner,
        owner_id: u.owner,
        species: "cat",
        name: "Murka",
        status: "home",
        sex: "female",
        birth_year: 2019,
        color: "tărcată",
        sterilized: true,
      }),
      pet({
        id: randomUUID(),
        public_code: "RJK4X9P",
        created_by: u.volunteer,
        species: "dog",
        name: "Rîjik",
        status: "street",
        sex: "male",
        color: "roșcat",
        ear_tag: "CH-0412",
        sterilized: true,
        rabies_date: "2026-05-02",
        area: "Ciocana, lângă piața centrală",
        special_marks: "Ureche stângă cu crotalie roșie",
        created_at: daysAgo(4),
      }),
      pet({
        id: randomUUID(),
        public_code: "LRD8M2Q",
        created_by: u.shelter,
        species: "dog",
        name: "Lord",
        status: "adoption",
        sex: "male",
        birth_year: 2023,
        color: "negru",
        sterilized: true,
        city: "Ialoveni",
        finder_notes: "Caută familie. Bun cu copiii.",
        created_at: daysAgo(2),
      }),
      pet({
        id: randomUUID(),
        public_code: "TSK9V3W",
        created_by: u.volunteer,
        owner_id: u.volunteer,
        species: "dog",
        name: "Tișka",
        status: "lost",
        sex: "female",
        color: "albă cu pete negre",
        lost_since: daysAgo(1),
        lost_area: "Rîșcani, str. Kiev",
        finder_notes: "Poartă zgardă verde.",
        created_at: daysAgo(20),
      }),
    ],
    messages: [],
    reports: [
      {
        id: randomUUID(),
        kind: "found",
        species: "cat",
        description: "Pisică gri, tânără, foarte prietenoasă, cu zgardă roșie fără medalion.",
        city: "Chișinău",
        area: "Centru, parcul Valea Morilor",
        photo_url: null,
        seen_on: daysAgo(1).slice(0, 10),
        reporter_id: null,
        reporter_contact: "+373 79 000 003",
        status: "open",
        created_at: daysAgo(1),
      },
    ],
    contactAccess: [],
    telegramTokens: [],
  };
}

let cache: DemoData | null = null;
let writing: Promise<void> = Promise.resolve();

async function load(): Promise<DemoData> {
  if (cache) return cache;
  const file = path.join(dataDir(), "demo.json");
  try {
    cache = JSON.parse(await fs.readFile(file, "utf8")) as DemoData;
  } catch {
    cache = seed();
    await save();
  }
  return cache!;
}

async function save() {
  const data = cache;
  if (!data) return;
  writing = writing.then(async () => {
    try {
      await fs.mkdir(dataDir(), { recursive: true });
      await fs.writeFile(path.join(dataDir(), "demo.json"), JSON.stringify(data, null, 2));
    } catch (err) {
      // A read-only disk only means demo changes won't survive a restart.
      console.warn("[demo store] could not save:", err);
    }
  });
  await writing;
}

function toPublic(p: Pet, profiles: Profile[]): PublicPet {
  const { created_by, owner_id, chip_number, private_notes, ...rest } = p;
  void owner_id;
  void chip_number;
  void private_notes;
  return { ...rest, registered_by_org: publicOrgName(profiles.find((x) => x.id === created_by)) };
}

function applyInput(base: Pet, input: PetInput, userId: string): Pet {
  const { photo, remove_photo, ...fields } = input;
  void photo;
  const wasLost = base.status === "lost";
  const next: Pet = { ...base, ...fields, updated_at: now() };
  // "home" makes the editor the owner if nobody is; "lost" keeps whoever it was (a street animal can go missing too).
  next.owner_id = input.status === "home" ? (base.owner_id ?? userId) : input.status === "lost" ? base.owner_id : null;
  if (next.status === "lost") {
    next.lost_since = wasLost ? base.lost_since : now();
  } else {
    next.lost_since = null;
    next.lost_area = null;
  }
  if (remove_photo) next.photo_url = null;
  return next;
}

async function requireUser(data: DemoData, userId: string) {
  const user = data.profiles.find((p) => p.id === userId);
  if (!user) throw new PermissionError("no user");
  return user;
}

async function requireMod(data: DemoData, userId: string) {
  const user = await requireUser(data, userId);
  if (!isModerator(user)) throw new PermissionError();
  return user;
}

export function createDemoStore(): Store {
  return {
    mode: "demo",

    async getProfile(userId) {
      const data = await load();
      return data.profiles.find((p) => p.id === userId) ?? null;
    },

    async updateOwnProfile(userId, patch) {
      const data = await load();
      const user = await requireUser(data, userId);
      Object.assign(user, patch);
      await save();
    },

    async listPetsForUser(userId) {
      const data = await load();
      return data.pets
        .filter((p) => p.created_by === userId || p.owner_id === userId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },

    async getEditablePet(userId, petId) {
      const data = await load();
      const user = await requireUser(data, userId);
      const p = data.pets.find((x) => x.id === petId);
      return p && canEditPet(user, p) ? p : null;
    },

    async createPet(userId, input) {
      const data = await load();
      const user = await requireUser(data, userId);
      if ((input.status === "street" || input.status === "foster" || input.status === "adoption") && !canRegisterWithoutOwner(user)) {
        throw new PermissionError("caretaker role needed");
      }
      let code = newPublicCode();
      while (data.pets.some((p) => p.public_code === code)) code = newPublicCode();
      const base = pet({ id: randomUUID(), public_code: code, created_by: userId, species: input.species, name: input.name, status: input.status, created_at: now() });
      const created = applyInput({ ...base, owner_id: null }, input, userId);
      if (input.status === "home" || input.status === "lost") created.owner_id = userId;
      if (input.photo) created.photo_url = await this.uploadPhoto(userId, input.photo);
      data.pets.push(created);
      await save();
      return created;
    },

    async updatePet(userId, petId, input) {
      const data = await load();
      const user = await requireUser(data, userId);
      const idx = data.pets.findIndex((p) => p.id === petId);
      if (idx < 0 || !canEditPet(user, data.pets[idx])) throw new PermissionError();
      if ((input.status === "street" || input.status === "foster" || input.status === "adoption") && !canRegisterWithoutOwner(user)) {
        throw new PermissionError("caretaker role needed");
      }
      const updated = applyInput(data.pets[idx], input, userId);
      if (input.photo) updated.photo_url = await this.uploadPhoto(userId, input.photo);
      data.pets[idx] = updated;
      await save();
      return updated;
    },

    async deletePet(userId, petId) {
      const data = await load();
      const user = await requireUser(data, userId);
      const p = data.pets.find((x) => x.id === petId);
      if (!p || !canEditPet(user, p)) throw new PermissionError();
      data.pets = data.pets.filter((x) => x.id !== petId);
      await save();
    },

    async getPublicPet(code) {
      const data = await load();
      const p = data.pets.find((x) => x.public_code === normalizeCode(code));
      return p ? toPublic(p, data.profiles) : null;
    },

    async findCodeByChip(userId, chip) {
      const data = await load();
      const user = await requireUser(data, userId);
      if (!canSearchChip(user)) throw new PermissionError();
      const clean = chip.replace(/\D/g, "");
      return data.pets.find((p) => p.chip_number?.replace(/\D/g, "") === clean)?.public_code ?? null;
    },

    async listLost() {
      const data = await load();
      return {
        pets: data.pets
          .filter((p) => p.status === "lost" || p.status === "adoption")
          .sort((a, b) => (b.lost_since ?? b.created_at).localeCompare(a.lost_since ?? a.created_at))
          .map((p) => toPublic(p, data.profiles)),
        reports: data.reports
          .filter((r) => r.status === "open")
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(({ reporter_id, reporter_contact, ...r }) => {
            void reporter_id;
            void reporter_contact;
            return r;
          }),
      };
    },

    async createReport(userId, input) {
      const data = await load();
      const { photo, ...fields } = input;
      const report: Report = {
        id: randomUUID(),
        ...fields,
        photo_url: photo ? await this.uploadPhoto(userId ?? "anon", photo) : null,
        reporter_id: userId,
        status: "open",
        created_at: now(),
      };
      data.reports.push(report);
      await save();
      return report;
    },

    async createFinderMessage(code, input, ipHash) {
      const data = await load();
      const p = data.pets.find((x) => x.public_code === normalizeCode(code));
      if (!p) return "not_found";
      const hourAgo = new Date(Date.now() - 3600000).toISOString();
      if (data.messages.filter((m) => m.ip_hash === ipHash && m.created_at > hourAgo).length >= 5) return "rate_limited";
      const message = {
        id: randomUUID(),
        pet_id: p.id,
        ...input,
        created_at: now(),
        delivered_email: false,
        delivered_telegram: false,
        ip_hash: ipHash,
      };
      data.messages.push(message);
      await save();
      const recipient = data.profiles.find((x) => x.id === (p.owner_id ?? p.created_by));
      const targets: OwnerTargets = {
        petName: p.name,
        publicCode: p.public_code,
        email: recipient?.email ?? null,
        telegramChatId: recipient?.telegram_chat_id ?? null,
        locale: recipient?.locale ?? "ro",
      };
      const { ip_hash, ...clean } = message;
      void ip_hash;
      return { message: clean, targets };
    },

    async markDelivered(messageId, channels) {
      const data = await load();
      const m = data.messages.find((x) => x.id === messageId);
      if (m) {
        m.delivered_email = channels.email;
        m.delivered_telegram = channels.telegram;
        await save();
      }
    },

    async listMessagesForUser(userId) {
      const data = await load();
      const mine = new Map(
        data.pets.filter((p) => p.created_by === userId || p.owner_id === userId).map((p) => [p.id, p]),
      );
      return data.messages
        .filter((m) => mine.has(m.pet_id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ ip_hash, ...m }) => {
          void ip_hash;
          const p = mine.get(m.pet_id)!;
          return { ...m, pet_name: p.name, pet_code: p.public_code };
        });
    },

    async createTelegramLinkToken(userId) {
      const data = await load();
      const token = newToken();
      data.telegramTokens = data.telegramTokens.filter((t) => t.user_id !== userId);
      data.telegramTokens.push({ token, user_id: userId });
      await save();
      return token;
    },

    async bindTelegram(token, chatId) {
      const data = await load();
      const t = data.telegramTokens.find((x) => x.token === token);
      const user = t && data.profiles.find((p) => p.id === t.user_id);
      if (!user) return false;
      user.telegram_chat_id = chatId;
      data.telegramTokens = data.telegramTokens.filter((x) => x.token !== token);
      await save();
      return true;
    },

    async unbindTelegram(userId) {
      const data = await load();
      const user = await requireUser(data, userId);
      user.telegram_chat_id = null;
      await save();
    },

    async uploadPhoto(userId, file) {
      const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/g, "");
      const name = `${randomUUID()}.${ext}`;
      await fs.mkdir(DEMO_UPLOAD_DIR(), { recursive: true });
      await fs.writeFile(path.join(DEMO_UPLOAD_DIR(), name), Buffer.from(await file.arrayBuffer()));
      void userId;
      return `/api/demo-uploads/${name}`;
    },

    admin: {
      async listPets(modId) {
        const data = await load();
        await requireMod(data, modId);
        return [...data.pets].sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async listReports(modId) {
        const data = await load();
        await requireMod(data, modId);
        return [...data.reports].sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async setReportStatus(modId, reportId, status) {
        const data = await load();
        await requireMod(data, modId);
        const r = data.reports.find((x) => x.id === reportId);
        if (r) r.status = status;
        await save();
      },
      async listRoleRequests(modId) {
        const data = await load();
        await requireMod(data, modId);
        return data.profiles.filter((p) => p.requested_role);
      },
      async decideRole(modId, userId, approve) {
        const data = await load();
        await requireMod(data, modId);
        const p = data.profiles.find((x) => x.id === userId);
        if (!p || !p.requested_role) return;
        if (approve) p.role = p.requested_role;
        p.requested_role = null;
        await save();
      },
      async setRole(modId, userId, role) {
        const data = await load();
        await requireMod(data, modId);
        const p = data.profiles.find((x) => x.id === userId);
        if (p) p.role = role;
        await save();
      },
      async listUsers(modId) {
        const data = await load();
        await requireMod(data, modId);
        return [...data.profiles].sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async getOwnerContact(modId, petId, reason) {
        const data = await load();
        await requireMod(data, modId);
        const p = data.pets.find((x) => x.id === petId);
        if (!p) return { owner: null, creator: null };
        data.contactAccess.push({ id: randomUUID(), pet_id: petId, moderator_id: modId, reason, created_at: now() });
        await save();
        return {
          owner: data.profiles.find((x) => x.id === p.owner_id) ?? null,
          creator: data.profiles.find((x) => x.id === p.created_by) ?? null,
        };
      },
      async listContactAccess(modId) {
        const data = await load();
        await requireMod(data, modId);
        return [...data.contactAccess].sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
    },
  };
}

/** Demo-only sign-in: creates a profile for any email so the flow can be tried end to end. */
export async function demoSignIn(email: string, locale: string): Promise<string> {
  const data = await load();
  const clean = email.trim().toLowerCase();
  let user = data.profiles.find((p) => p.email === clean);
  if (!user) {
    user = profile({ id: randomUUID(), email: clean, role: "owner", city: null, locale, created_at: now() });
    data.profiles.push(user);
    await save();
  }
  return user.id;
}

export async function demoListUsers(): Promise<Profile[]> {
  const data = await load();
  return data.profiles;
}

import type {
  ContactAccess,
  FinderMessage,
  FinderMessageInput,
  Pet,
  PetInput,
  Profile,
  ProfilePatch,
  PublicPet,
  PublicReport,
  Report,
  ReportInput,
  RequestableRole,
  Role,
} from "../types";

/** Where a finder's message should be delivered. Server-only, never sent to the browser. */
export interface OwnerTargets {
  petName: string | null;
  publicCode: string;
  email: string | null;
  telegramChatId: string | null;
  locale: string;
}

/**
 * Everything the site reads and writes goes through this interface.
 * Two implementations: Supabase (real) and a local demo store for trying the site
 * before any accounts exist. Every method that takes `userId` enforces permissions
 * for that user itself; callers must pass the signed-in user, never a value from a form.
 */
export interface Store {
  readonly mode: "demo" | "supabase";

  getProfile(userId: string): Promise<Profile | null>;
  updateOwnProfile(userId: string, patch: ProfilePatch): Promise<void>;

  listPetsForUser(userId: string): Promise<Pet[]>;
  /** Returns the pet only if this user may edit it. */
  getEditablePet(userId: string, petId: string): Promise<Pet | null>;
  createPet(userId: string, input: PetInput): Promise<Pet>;
  updatePet(userId: string, petId: string, input: PetInput): Promise<Pet>;
  deletePet(userId: string, petId: string): Promise<void>;

  getPublicPet(code: string): Promise<PublicPet | null>;
  /** Vets, shelters, organizations and moderators can look an animal up by microchip. */
  findCodeByChip(userId: string, chip: string): Promise<string | null>;

  listLost(): Promise<{ pets: PublicPet[]; reports: PublicReport[] }>;
  createReport(userId: string | null, input: ReportInput): Promise<Report>;

  /** Trusted server path: stores a finder's message and returns where to deliver it. */
  createFinderMessage(
    code: string,
    input: FinderMessageInput,
    ipHash: string,
  ): Promise<{ message: FinderMessage; targets: OwnerTargets } | "not_found" | "rate_limited">;
  markDelivered(messageId: string, channels: { email: boolean; telegram: boolean }): Promise<void>;
  listMessagesForUser(userId: string): Promise<(FinderMessage & { pet_name: string | null; pet_code: string })[]>;

  createTelegramLinkToken(userId: string): Promise<string>;
  bindTelegram(token: string, chatId: string): Promise<boolean>;
  unbindTelegram(userId: string): Promise<void>;

  uploadPhoto(userId: string, file: File): Promise<string>;

  admin: {
    listPets(modId: string): Promise<Pet[]>;
    listReports(modId: string): Promise<Report[]>;
    setReportStatus(modId: string, reportId: string, status: Report["status"]): Promise<void>;
    listRoleRequests(modId: string): Promise<Profile[]>;
    decideRole(modId: string, userId: string, approve: boolean): Promise<void>;
    setRole(modId: string, userId: string, role: Role): Promise<void>;
    listUsers(modId: string): Promise<Profile[]>;
    /** Owner contacts for one pet. Every call is written to the access log with a reason. */
    getOwnerContact(
      modId: string,
      petId: string,
      reason: string,
    ): Promise<{ owner: Profile | null; creator: Profile | null }>;
    listContactAccess(modId: string): Promise<ContactAccess[]>;
  };
}

export class PermissionError extends Error {
  constructor(message = "forbidden") {
    super(message);
  }
}

export type { RequestableRole };

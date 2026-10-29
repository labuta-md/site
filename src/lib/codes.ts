import { randomBytes } from "crypto";

// No 0/O, 1/I/L: the code is printed on tags and sometimes typed by hand.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newPublicCode(length = 7): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function newToken(): string {
  return randomBytes(18).toString("base64url");
}

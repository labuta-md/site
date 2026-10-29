import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import en from "./en";
import ro from "./ro";
import ru, { type Dict } from "./ru";

const dictionaries: Record<Locale, Dict> = { ro, ru, en };

export function getDict(lang: string): Dict {
  return dictionaries[isLocale(lang) ? lang : DEFAULT_LOCALE];
}

/** Fills {placeholders} in a dictionary string. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

export function formatDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return "";
  const tag = lang === "ro" ? "ro-MD" : lang === "ru" ? "ru-MD" : "en-GB";
  return new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Chisinau" }).format(
    new Date(iso),
  );
}

export type { Dict };
export * from "./config";

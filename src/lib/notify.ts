import "server-only";
import { fmt, getDict } from "./i18n";
import type { OwnerTargets } from "./store/store";
import type { FinderMessage } from "./types";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);
}

export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * SMS is not wired up yet: it costs money per message and needs abuse protection first.
 * When a provider is chosen, implement it here and call it from notifyOwner.
 */
export async function sendSms(phone: string, text: string): Promise<boolean> {
  void phone;
  void text;
  return false;
}

/** Delivers a finder's message to the owner (or caretaker) on every channel they have. */
export async function notifyOwner(targets: OwnerTargets, msg: FinderMessage) {
  const t = getDict(targets.locale).notify;
  const name = targets.petName || t.unnamed;
  const lines = [
    fmt(t.intro, { name }),
    "",
    msg.message,
    "",
    msg.finder_name ? fmt(t.finder, { name: msg.finder_name }) : null,
    msg.finder_phone ? fmt(t.phone, { phone: msg.finder_phone }) : null,
    msg.location_text ? fmt(t.location, { location: msg.location_text }) : null,
    fmt(t.link, { url: `${siteUrl()}/${targets.locale}/p/${targets.publicCode}` }),
  ].filter((l) => l !== null);
  const body = lines.join("\n");

  const [email, telegram] = await Promise.all([
    targets.email ? sendEmail(targets.email, fmt(t.subject, { name }), `${body}\n\n${t.footer}`) : false,
    targets.telegramChatId ? sendTelegram(targets.telegramChatId, body) : false,
  ]);
  if (!email && !telegram) console.info("[notify] no channel delivered message", msg.id);
  return { email, telegram };
}

import type { NextRequest } from "next/server";
import { getDict } from "@/lib/i18n";
import { sendTelegram } from "@/lib/notify";
import { getStore } from "@/lib/store";

/**
 * Telegram bot webhook. Register it once (see SETUP.md):
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("forbidden", { status: 403 });
  }
  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const chatId = msg?.chat?.id;
  const text: string = msg?.text ?? "";
  if (!chatId) return Response.json({ ok: true });

  const lang = ["ro", "ru", "en"].includes(msg?.from?.language_code) ? msg.from.language_code : "ro";
  const t = getDict(lang).notify;
  const match = text.match(/^\/start\s+(\S+)/);
  if (match) {
    const ok = await getStore().bindTelegram(match[1], String(chatId));
    await sendTelegram(String(chatId), ok ? t.telegramLinked : t.telegramUnknown);
  } else {
    await sendTelegram(String(chatId), t.telegramHello);
  }
  return Response.json({ ok: true });
}

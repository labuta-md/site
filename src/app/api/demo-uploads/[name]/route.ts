import { promises as fs } from "fs";
import path from "path";
import { DEMO_UPLOAD_DIR } from "@/lib/store/demo";

const TYPES: Record<string, string> = { jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };

/** Serves photos uploaded in demo mode. With Supabase, photos come from its storage instead. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const file = await fs.readFile(path.join(DEMO_UPLOAD_DIR(), name));
    const ext = name.split(".").pop()!;
    return new Response(new Uint8Array(file), { headers: { "content-type": TYPES[ext] ?? "application/octet-stream" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

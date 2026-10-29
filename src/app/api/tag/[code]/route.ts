import type { NextRequest } from "next/server";
import { normalizeCode } from "@/lib/codes";
import { getDict } from "@/lib/i18n";
import { tagSvg } from "@/lib/qr";
import { getStore } from "@/lib/store";

/** Print-ready tag artwork (SVG) for one animal. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const pet = await getStore().getPublicPet(code);
  if (!pet) return new Response("Not found", { status: 404 });
  const t = getDict(req.nextUrl.searchParams.get("lang") ?? "ro");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n${tagSvg({ code, name: pet.name, caption: t.home.tagFound, standalone: true })}`;
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "content-disposition": `attachment; filename="labuta-${code}.svg"`,
    },
  });
}

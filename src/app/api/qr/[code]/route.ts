import { normalizeCode } from "@/lib/codes";
import { qrPng } from "@/lib/qr";
import { getStore } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  if (!(await getStore().getPublicPet(code))) return new Response("Not found", { status: 404 });
  const png = await qrPng(code);
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "content-disposition": `attachment; filename="labuta-qr-${code}.png"`,
      "cache-control": "public, max-age=86400",
    },
  });
}

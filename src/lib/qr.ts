import "server-only";
import QRCode from "qrcode";
import { siteUrl } from "./notify";

export function publicPetUrl(code: string) {
  return `${siteUrl()}/p/${code}`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** QR modules as one SVG path, in a square of `size` modules. */
function qrPath(text: string): { d: string; size: number } {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return { d, size };
}

/**
 * The collar tag: the shape people will hang on a collar and see on the site.
 * Returned as an SVG string so the same artwork is shown on the page and downloaded for print.
 */
export function tagSvg(opts: {
  code: string;
  name: string | null;
  caption: string;
  standalone?: boolean;
  /** What the QR opens. Defaults to the pet's public page. */
  url?: string;
}): string {
  const { d, size } = qrPath(opts.url ?? publicPetUrl(opts.code));
  const qrBox = 168;
  const scale = qrBox / size;
  const name = escapeXml((opts.name || "").slice(0, 18));
  const caption = escapeXml(opts.caption);
  const font = `font-family="Rubik, Arial, sans-serif"`;
  const nameSize = name.length > 11 ? 24 : 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 340" role="img" aria-label="${name || opts.code} QR">
  ${opts.standalone ? `<title>${name || opts.code} — labuta.md</title>` : ""}
  <rect x="12" y="10" width="216" height="320" rx="26" fill="#FFC42E"/>
  <circle cx="120" cy="34" r="11" fill="none" stroke="#3B2A00" stroke-width="3"/>
  <circle cx="120" cy="34" r="6" fill="#ffffff"/>
  <text x="120" y="70" text-anchor="middle" ${font} font-size="12.5" font-weight="500" fill="#3B2A00">${caption}</text>
  <rect x="28" y="82" width="184" height="184" rx="10" fill="#ffffff"/>
  <g transform="translate(36 90) scale(${scale.toFixed(4)})" fill="#1D2A31"><path d="${d}"/></g>
  ${name ? `<text x="120" y="${300}" text-anchor="middle" ${font} font-size="${nameSize}" font-weight="800" fill="#1D2A31">${name}</text>` : ""}
  <text x="120" y="${name ? 322 : 305}" text-anchor="middle" ${font} font-size="12" font-weight="500" fill="#3B2A00" letter-spacing="1">labuta.md/p/${escapeXml(opts.code)}</text>
</svg>`;
}

export async function qrPng(code: string): Promise<Buffer> {
  return QRCode.toBuffer(publicPetUrl(code), { errorCorrectionLevel: "M", width: 1024, margin: 2 });
}

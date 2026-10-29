import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, pickLocale } from "./lib/i18n/config";

const LANG_COOKIE = "labuta_lang";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  // No language in the path (e.g. a QR code: /p/ABC1234) → pick one and redirect.
  if (!isLocale(first)) {
    const saved = request.cookies.get(LANG_COOKIE)?.value;
    const lang = isLocale(saved) ? saved : pickLocale(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request });
  response.cookies.set(LANG_COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  // Keep the Supabase sign-in fresh.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Demo mode: test data only, keep it out of search engines.
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    });
    await supabase.auth.getUser();
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|api|auth|favicon.ico|robots.txt|.*\\..*).*)"],
};

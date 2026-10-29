import { NextResponse, type NextRequest } from "next/server";
import { userClient } from "@/lib/supabase/clients";

/** Where the sign-in link from the email lands. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") || "/ro/me";
  // Only allow redirects within this site.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/ro/me";
  const lang = next.split("/")[1] || "ro";

  if (code) {
    const { error } = await (await userClient()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL(`/${lang}/login?error=1`, url.origin));
}

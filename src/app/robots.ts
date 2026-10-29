import type { MetadataRoute } from "next";

/** In demo mode (no database connected) ask search engines to stay away entirely. */
export default function robots(): MetadataRoute.Robots {
  const demo = !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return demo
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/*/me", "/*/admin", "/*/pets/"] } };
}

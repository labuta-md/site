import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { currentUser } from "@/lib/auth";
import { getDict, isLocale, LOCALES } from "@/lib/i18n";
import { siteUrl } from "@/lib/notify";
import { getStore } from "@/lib/store";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(lang);
  return {
    title: { default: t.meta.title, template: "%s · labuta.md" },
    description: t.meta.description,
    metadataBase: new URL(siteUrl()),
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
  };
}

export const viewport: Viewport = {
  themeColor: "#FFC42E",
  width: "device-width",
  initialScale: 1,
};

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const user = await currentUser();
  const demo = getStore().mode === "demo";

  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap&subset=cyrillic,latin-ext"
        />
      </head>
      <body>
        {demo && (
          <div className="demo-banner">
            <div className="wrap">{t.common.demoBanner}</div>
          </div>
        )}
        <Suspense>
          <Header lang={lang} t={t} user={user} />
        </Suspense>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p>{t.common.footer}</p>
            <Link href={`/${lang}/privacy`}>{t.common.privacyLink}</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}

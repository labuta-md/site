import Link from "next/link";
import { signOut } from "@/lib/actions";
import { LOCALES, type Dict } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import { LangSwitch } from "./LangSwitch";

export function TagMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 22 28" aria-hidden="true">
      <rect x="1" y="1" width="20" height="26" rx="5" fill="#FFC42E" />
      <circle cx="11" cy="6" r="2.4" fill="none" stroke="#3B2A00" strokeWidth="1.6" />
      <rect x="6" y="11" width="10" height="10" rx="1.5" fill="#1D2A31" />
      <rect x="8.3" y="13.3" width="2.4" height="2.4" fill="#FFC42E" />
      <rect x="11.6" y="16.6" width="2.4" height="2.4" fill="#FFC42E" />
    </svg>
  );
}

export function Header({ lang, t, user }: { lang: string; t: Dict; user: Profile | null }) {
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href={`/${lang}`} className="wordmark">
          <TagMark className="wordmark-tag" />
          labuta
        </Link>
        <nav className="site-nav" aria-label={t.nav.menu}>
          <Link href={`/${lang}/lost-found`}>{t.nav.lostFound}</Link>
          {user ? (
            <>
              <Link href={`/${lang}/me`}>{t.nav.myPets}</Link>
              <Link href={`/${lang}/me/profile`}>{t.nav.profile}</Link>
              {user.role === "moderator" && <Link href={`/${lang}/admin`}>{t.nav.admin}</Link>}
              <form action={signOut.bind(null, lang)}>
                <button className="link-button" type="submit">
                  {t.nav.logout}
                </button>
              </form>
            </>
          ) : (
            <Link href={`/${lang}/login`}>{t.nav.login}</Link>
          )}
          <LangSwitch current={lang} locales={[...LOCALES]} label={t.nav.language} />
        </nav>
      </div>
    </header>
  );
}

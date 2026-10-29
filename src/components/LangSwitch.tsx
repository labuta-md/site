"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function LangSwitch({ current, locales, label }: { current: string; locales: string[]; label: string }) {
  const pathname = usePathname() || `/${current}`;
  const query = useSearchParams()?.toString();
  const rest = pathname.split("/").slice(2).join("/");
  return (
    <span className="lang-switch" role="group" aria-label={label}>
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}${query ? `?${query}` : ""}`}
          aria-current={l === current ? "true" : undefined}
          hrefLang={l}
          lang={l}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </span>
  );
}

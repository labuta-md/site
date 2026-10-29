import Link from "next/link";
import { AnimalRow, ReportRow } from "@/components/Animal";
import { getDict } from "@/lib/i18n";
import { getStore } from "@/lib/store";
import { SPECIES, type Species } from "@/lib/types";

const FILTERS = ["all", "lost", "found", "adoption"] as const;
type Filter = (typeof FILTERS)[number];

export default async function LostFound({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ f?: string; s?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const t = getDict(lang);
  const f: Filter = (FILTERS as readonly string[]).includes(sp.f ?? "") ? (sp.f as Filter) : "all";
  const s: Species | null = (SPECIES as readonly string[]).includes(sp.s ?? "") ? (sp.s as Species) : null;
  const { pets, reports } = await getStore().listLost();

  const shownPets = pets.filter(
    (p) => (f === "all" || (f === "lost" && p.status === "lost") || (f === "adoption" && p.status === "adoption")) && (!s || p.species === s),
  );
  const shownReports = reports.filter((r) => (f === "all" || r.kind === f) && (!s || r.species === s));

  const label: Record<Filter, string> = {
    all: t.lostFound.filterAll,
    lost: t.lostFound.filterLost,
    found: t.lostFound.filterFound,
    adoption: t.lostFound.filterAdoption,
  };
  const href = (nf: Filter, ns: Species | null) => {
    const q = new URLSearchParams();
    if (nf !== "all") q.set("f", nf);
    if (ns) q.set("s", ns);
    const qs = q.toString();
    return `/${lang}/lost-found${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="wrap stack">
      <div className="section-head">
        <h1 style={{ margin: 0 }}>{t.lostFound.title}</h1>
        <div className="btn-row">
          <Link className="btn btn-small" href={`/${lang}/lost-found/report?kind=found`}>
            {t.lostFound.reportFound}
          </Link>
          <Link className="btn btn-outline btn-small" href={`/${lang}/lost-found/report?kind=lost`}>
            {t.lostFound.reportLost}
          </Link>
        </div>
      </div>
      <p className="muted">{t.lostFound.text}</p>

      <nav className="filters" aria-label={t.lostFound.title}>
        {FILTERS.map((x) => (
          <Link key={x} href={href(x, s)} className="filter-chip" aria-current={x === f ? "page" : undefined}>
            {label[x]}
          </Link>
        ))}
        <span className="filter-gap" aria-hidden="true" />
        {SPECIES.map((x) => (
          <Link key={x} href={href(f, s === x ? null : x)} className="filter-chip" aria-current={s === x ? "page" : undefined}>
            {t.speciesPlural[x]}
          </Link>
        ))}
      </nav>

      {shownPets.length === 0 && shownReports.length === 0 ? (
        <p className="muted">{t.lostFound.empty}</p>
      ) : (
        <ul className="animal-list wide">
          {shownPets.map((p) => (
            <li key={p.id}>
              <AnimalRow pet={p} href={`/${lang}/p/${p.public_code}`} t={t} lang={lang} />
            </li>
          ))}
          {shownReports.map((r) => (
            <li key={r.id}>
              <ReportRow report={r} t={t} lang={lang} />
            </li>
          ))}
        </ul>
      )}
      {shownReports.length > 0 && <p className="small muted">{t.lostFound.contactHint}</p>}
    </div>
  );
}

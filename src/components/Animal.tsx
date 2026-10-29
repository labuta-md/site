import Link from "next/link";
import { fmt, formatDate, type Dict } from "@/lib/i18n";
import type { PetStatus, PublicPet, PublicReport, Species } from "@/lib/types";

export function SpeciesIcon({ species, size = 40 }: { species: Species; size?: number }) {
  // Simple silhouettes so a card without a photo still reads at a glance.
  return species === "cat" ? (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 6l7 7h10l7-7v18c0 7-5 12-12 12S8 31 8 24z" fill="currentColor" opacity=".35" />
      <circle cx="15" cy="21" r="2" fill="currentColor" />
      <circle cx="25" cy="21" r="2" fill="currentColor" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M6 10c0-3 3-4 6-2l3 3h10l3-3c3-2 6-1 6 2v6l-3 2v6c0 7-5 12-11 12S9 31 9 24v-6l-3-2z" fill="currentColor" opacity=".35" />
      <circle cx="15" cy="21" r="2" fill="currentColor" />
      <circle cx="25" cy="21" r="2" fill="currentColor" />
      <ellipse cx="20" cy="28" rx="3" ry="2" fill="currentColor" />
    </svg>
  );
}

export function StatusPill({ status, t }: { status: PetStatus; t: Dict }) {
  return <span className={`pill pill-${status}`}>{t.status[status]}</span>;
}

export function Thumb({ url, species, alt }: { url: string | null; species: Species; alt: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="photo" src={url} alt={alt} loading="lazy" />
  ) : (
    <div className="photo photo-placeholder">
      <SpeciesIcon species={species} />
    </div>
  );
}

type RowPet = Pick<PublicPet, "species" | "name" | "status" | "photo_url" | "city" | "area" | "lost_since" | "lost_area">;

export function AnimalRow({ pet, href, t, lang }: { pet: RowPet; href: string; t: Dict; lang: string }) {
  const name = pet.name || t.species[pet.species];
  const place = pet.status === "lost" ? pet.lost_area || pet.area : pet.area;
  return (
    <Link href={href} className="animal-row">
      <Thumb url={pet.photo_url} species={pet.species} alt={name} />
      <div>
        <h3>{name}</h3>
        <StatusPill status={pet.status} t={t} />
        <p className="animal-meta">
          {[pet.city, place].filter(Boolean).join(", ")}
          {pet.status === "lost" && pet.lost_since && (
            <>
              <br />
              {fmt(t.lostFound.lostSince, { date: formatDate(pet.lost_since, lang) })}
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

export function ReportRow({ report, t, lang }: { report: PublicReport; t: Dict; lang: string }) {
  return (
    <div className="animal-row">
      <Thumb url={report.photo_url} species={report.species} alt={t.species[report.species]} />
      <div>
        <h3>{t.species[report.species]}</h3>
        <span className={`pill ${report.kind === "found" ? "pill-found" : "pill-lost"}`}>
          {report.kind === "found" ? t.lostFound.foundLabel : t.lostFound.lostLabel}
        </span>
        <p className="animal-meta">{report.description}</p>
        <p className="animal-meta">
          {[report.city, report.area].filter(Boolean).join(", ")}
          {report.seen_on && (
            <>
              <br />
              {fmt(t.lostFound.seenOn, { date: formatDate(report.seen_on, lang) })}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

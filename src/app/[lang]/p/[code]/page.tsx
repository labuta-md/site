import type { Metadata } from "next";
import Link from "next/link";
import { PetDetails, PetPhoto } from "@/components/PetDetails";
import { fmt, formatDate, getDict, type Dict } from "@/lib/i18n";
import { getStore } from "@/lib/store";
import type { PublicPet } from "@/lib/types";
import { FinderForm } from "./FinderForm";

type Props = { params: Promise<{ lang: string; code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, code } = await params;
  const t = getDict(lang);
  const pet = await getStore().getPublicPet(code);
  if (!pet) return { title: t.publicPet.notFoundTitle, robots: { index: false } };
  const name = pet.name || t.species[pet.species];
  return {
    title: pet.status === "lost" ? `${name}: ${t.status.lost}` : name,
    robots: { index: pet.status === "lost" || pet.status === "adoption" },
    openGraph: pet.photo_url ? { images: [pet.photo_url] } : undefined,
  };
}

function Banner({ pet, t, lang }: { pet: PublicPet; t: Dict; lang: string }) {
  const p = t.publicPet;
  switch (pet.status) {
    case "lost":
      return (
        <div className="status-banner banner-lost" role="status">
          {fmt(p.lostBanner, { date: formatDate(pet.lost_since, lang) })}
          {pet.lost_area && <p>{fmt(p.lostArea, { area: pet.lost_area })}</p>}
        </div>
      );
    case "adoption":
      return <div className="status-banner banner-adoption">{p.adoptionBanner}</div>;
    case "street":
      return <div className="status-banner banner-street">{p.streetBanner}</div>;
    case "foster":
      return <div className="status-banner banner-foster">{p.fosterBanner}</div>;
    default:
      return null;
  }
}

export default async function PublicPetPage({ params }: Props) {
  const { lang, code } = await params;
  const t = getDict(lang);
  const pet = await getStore().getPublicPet(code);

  if (!pet) {
    return (
      <div className="wrap narrow stack">
        <h1>{t.publicPet.notFoundTitle}</h1>
        <p>{t.publicPet.notFoundText}</p>
        <Link className="btn" href={`/${lang}/lost-found/report?kind=found`}>
          {t.publicPet.reportFound}
        </Link>
      </div>
    );
  }

  const name = pet.name || t.species[pet.species];
  const caretaker = pet.status === "street" || pet.status === "foster" || pet.status === "adoption";

  return (
    <div className="wrap stack">
      <Banner pet={pet} t={t} lang={lang} />
      <div className="pet-hero">
        <PetPhoto pet={pet} alt={name} />
        <div className="stack">
          <h1 style={{ margin: 0 }}>{name}</h1>
          {pet.registered_by_org && <p className="muted">{fmt(t.publicPet.registeredBy, { org: pet.registered_by_org })}</p>}
          {pet.finder_notes && (
            <div className="callout-tag">
              <strong>{t.petForm.finderNotes}</strong>
              <p style={{ margin: "4px 0 0" }}>{pet.finder_notes}</p>
            </div>
          )}
          <PetDetails pet={pet} t={t} lang={lang} />
        </div>
      </div>

      <section className="finder-box section narrow" aria-labelledby="found-title">
        <h2 id="found-title">{t.publicPet.foundTitle}</h2>
        <p>{caretaker ? t.publicPet.foundTextStreet : t.publicPet.foundText}</p>
        <FinderForm code={pet.public_code} t={t} />
      </section>
    </div>
  );
}

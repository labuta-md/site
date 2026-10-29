import Link from "next/link";
import { AnimalRow } from "@/components/Animal";
import { getDict } from "@/lib/i18n";
import { siteUrl } from "@/lib/notify";
import { tagSvg } from "@/lib/qr";
import { getStore } from "@/lib/store";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const { pets } = await getStore().listLost();
  const lostNow = pets.filter((p) => p.status === "lost").slice(0, 4);
  const sampleName = lang === "ru" ? "Бобик" : "Bobik";
  const tag = tagSvg({ code: "BOB1K23", name: sampleName, caption: t.home.tagFound, url: siteUrl() });

  return (
    <>
      <section className="wrap hero">
        <div>
          <h1>{t.home.heroTitle}</h1>
          <p className="hero-lead">{t.home.heroText}</p>
          <div className="btn-row">
            <Link className="btn" href={`/${lang}/pets/new`}>
              {t.home.ctaRegister}
            </Link>
            <Link className="btn btn-outline" href={`/${lang}/lost-found/report?kind=found`}>
              {t.home.ctaFound}
            </Link>
          </div>
          <p className="small" style={{ marginTop: 16 }}>
            <Link href={`/${lang}/lost-found/report?kind=lost`}>{t.home.ctaLost}</Link>
          </p>
        </div>
        <div className="hero-tag" dangerouslySetInnerHTML={{ __html: tag }} />
      </section>

      <section className="wrap section">
        <h2>{t.home.howTitle}</h2>
        <ol className="steps">
          {t.home.steps.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p className="muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {lostNow.length > 0 && (
        <section className="wrap section">
          <div className="section-head">
            <h2>{t.home.lostNow}</h2>
            <Link href={`/${lang}/lost-found?f=lost`}>{t.home.seeAll}</Link>
          </div>
          <ul className="animal-list">
            {lostNow.map((p) => (
              <li key={p.id}>
                <AnimalRow pet={p} href={`/${lang}/p/${p.public_code}`} t={t} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="band">
        <div className="wrap split">
          <div>
            <h2>{t.home.privacyTitle}</h2>
            <p>{t.home.privacyText}</p>
            <Link href={`/${lang}/privacy`}>{t.common.privacyLink}</Link>
          </div>
          <div>
            <h2>{t.home.caretakersTitle}</h2>
            <p>{t.home.caretakersText}</p>
            <Link className="btn btn-outline" href={`/${lang}/me/profile`}>
              {t.home.caretakersCta}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

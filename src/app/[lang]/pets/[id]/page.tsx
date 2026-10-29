import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/Animal";
import { PetDetails } from "@/components/PetDetails";
import { requireUser } from "@/lib/auth";
import { setLost } from "@/lib/actions";
import { fmt, getDict } from "@/lib/i18n";
import { tagSvg } from "@/lib/qr";
import { getStore } from "@/lib/store";

export default async function PetPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang);
  const pet = await getStore().getEditablePet(user.id, id);
  if (!pet) notFound();
  const name = pet.name || t.species[pet.species];
  const tag = tagSvg({ code: pet.public_code, name: pet.name, caption: t.home.tagFound });

  return (
    <div className="wrap stack">
      <p>
        <Link href={`/${lang}/me`}>{t.common.back}</Link>
      </p>
      <div className="title-row">
        <h1 style={{ margin: 0 }}>{name}</h1>
        <StatusPill status={pet.status} t={t} />
      </div>

      <div className="btn-row">
        <Link className="btn btn-outline btn-small" href={`/${lang}/pets/${pet.id}/edit`}>
          {t.petPage.edit}
        </Link>
        <Link className="btn btn-outline btn-small" href={`/${lang}/p/${pet.public_code}`}>
          {t.petPage.openPublic}
        </Link>
        <form action={setLost.bind(null, lang, pet.id, pet.status !== "lost")}>
          <button className={`btn btn-small ${pet.status === "lost" ? "btn-tag" : "btn-danger"}`} type="submit">
            {pet.status === "lost" ? t.petPage.markFound : t.petPage.markLost}
          </button>
        </form>
      </div>

      <section className="section">
        <h2>{t.petPage.qrTitle}</h2>
        <div className="qr-panel">
          <div dangerouslySetInnerHTML={{ __html: tag }} />
          <div>
            <p>{fmt(t.petPage.qrText, { name })}</p>
            <p className="muted">
              {t.petPage.code}: <strong>{pet.public_code}</strong>
            </p>
            <div className="btn-row">
              <a className="btn btn-small" href={`/api/tag/${pet.public_code}?lang=${lang}`} download={`labuta-${pet.public_code}.svg`}>
                {t.petPage.downloadSvg}
              </a>
              <a className="btn btn-outline btn-small" href={`/api/qr/${pet.public_code}`} download={`labuta-qr-${pet.public_code}.png`}>
                {t.petPage.downloadPng}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <PetDetails pet={pet} t={t} lang={lang} showPrivate />
      </section>
    </div>
  );
}

import Link from "next/link";
import { AnimalRow } from "@/components/Animal";
import { requireUser } from "@/lib/auth";
import { fmt, formatDate, getDict } from "@/lib/i18n";
import { canSearchChip } from "@/lib/permissions";
import { getStore } from "@/lib/store";
import { ChipSearch } from "./ChipSearch";

export default async function MyAnimals({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang);
  const store = getStore();
  const [pets, messages] = await Promise.all([store.listPetsForUser(user.id), store.listMessagesForUser(user.id)]);

  return (
    <div className="wrap stack">
      <div className="section-head">
        <h1>{t.me.title}</h1>
        <Link className="btn" href={`/${lang}/pets/new`}>
          {t.me.add}
        </Link>
      </div>

      {user.requested_role && (
        <p className="notice">{fmt(t.me.roleRequested, { role: t.roles[user.requested_role] })}</p>
      )}
      {!user.city && (
        <p className="notice">
          {t.me.completeProfile} <Link href={`/${lang}/me/profile`}>{t.me.openProfile}</Link>
        </p>
      )}

      {pets.length === 0 ? (
        <p className="muted">{t.me.empty}</p>
      ) : (
        <ul className="animal-list wide">
          {pets.map((p) => (
            <li key={p.id}>
              <AnimalRow pet={p} href={`/${lang}/pets/${p.id}`} t={t} lang={lang} />
            </li>
          ))}
        </ul>
      )}

      {canSearchChip(user) && (
        <section className="section narrow">
          <ChipSearch lang={lang} t={t} />
        </section>
      )}

      <section className="section">
        <h2>{t.me.messagesTitle}</h2>
        {messages.length === 0 ? (
          <p className="muted">{t.me.noMessages}</p>
        ) : (
          <ul className="message-list">
            {messages.map((m) => (
              <li key={m.id}>
                <p className="small muted" style={{ marginBottom: 6 }}>
                  <strong>{m.pet_name || m.pet_code}</strong> · {formatDate(m.created_at, lang)}
                </p>
                <p style={{ whiteSpace: "pre-line" }}>{m.message}</p>
                <p className="small" style={{ margin: 0 }}>
                  {m.finder_name && (
                    <>
                      {t.me.from}: {m.finder_name}
                      <br />
                    </>
                  )}
                  {m.finder_phone && (
                    <>
                      {t.me.phone}: <a href={`tel:${m.finder_phone.replace(/[^\d+]/g, "")}`}>{m.finder_phone}</a>
                      <br />
                    </>
                  )}
                  {m.location_text && (
                    <>
                      {t.me.where}: {m.location_text}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

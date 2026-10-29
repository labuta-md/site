import { requireUser } from "@/lib/auth";
import { connectTelegram, disconnectTelegram } from "@/lib/actions";
import { getDict } from "@/lib/i18n";
import { telegramConfigured } from "@/lib/notify";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang);

  return (
    <div className="wrap narrow stack">
      <h1>{t.profile.title}</h1>
      <p className="muted">{user.email}</p>
      <ProfileForm lang={lang} t={t} user={user} />

      <section className="section">
        <h2>{t.profile.telegramTitle}</h2>
        <p>{t.profile.telegramText}</p>
        {!telegramConfigured() ? (
          <p className="muted">{t.profile.telegramNotConfigured}</p>
        ) : user.telegram_chat_id ? (
          <form action={disconnectTelegram.bind(null, lang)} className="btn-row" style={{ alignItems: "center" }}>
            <span className="notice notice-ok">{t.profile.telegramConnected}</span>
            <button className="btn btn-outline btn-small" type="submit">
              {t.profile.telegramDisconnect}
            </button>
          </form>
        ) : (
          <form action={connectTelegram.bind(null, lang)}>
            <button className="btn" type="submit">
              {t.profile.telegramConnect}
            </button>
            <p className="small muted" style={{ marginTop: 8 }}>
              {t.profile.telegramOpen}
            </p>
          </form>
        )}
        <p className="small muted">{t.profile.smsSoon}</p>
      </section>
    </div>
  );
}

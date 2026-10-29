import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { demoSignInAs } from "@/lib/actions";
import { getDict } from "@/lib/i18n";
import { getStore } from "@/lib/store";
import { demoListUsers } from "@/lib/store/demo";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { lang } = await params;
  const { error } = await searchParams;
  const t = getDict(lang);
  if (await currentUser()) redirect(`/${lang}/me`);
  const demoUsers = getStore().mode === "demo" ? await demoListUsers() : [];

  return (
    <div className="wrap narrow stack">
      <h1>{t.login.title}</h1>
      <p>{t.login.text}</p>
      {error && (
        <p className="notice notice-error" role="alert">
          {t.login.failed}
        </p>
      )}
      <LoginForm lang={lang} t={t} />

      {demoUsers.length > 0 && (
        <section className="section">
          <h2>{t.login.demoTitle}</h2>
          <p className="muted">{t.login.demoText}</p>
          <form action={demoSignInAs.bind(null, lang)} className="form">
            <div className="field">
              <label htmlFor="user_id" className="visually-hidden">
                {t.login.demoTitle}
              </label>
              <select id="user_id" name="user_id">
                {demoUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {t.roles[u.role]}: {u.org_name || u.display_name || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button className="btn btn-outline" type="submit">
                {t.login.demoContinue}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/lib/actions";
import { fmt, type Dict } from "@/lib/i18n";

export function LoginForm({ lang, t }: { lang: string; t: Dict }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn.bind(null, lang), null);

  if (state?.ok) {
    return (
      <p className="notice notice-ok" role="status">
        {fmt(t.login.sent, { email: String(state.message) })}
      </p>
    );
  }

  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="email">{t.login.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
      </div>
      {state?.error && (
        <p className="notice notice-error" role="alert">
          {state.error === "invalidEmail" ? t.login.invalidEmail : t.common.errorGeneric}
        </p>
      )}
      <div>
        <button className="btn" type="submit" disabled={pending}>
          {t.login.send}
        </button>
      </div>
    </form>
  );
}

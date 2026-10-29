"use client";

import { useActionState } from "react";
import { searchChip, type FormState } from "@/lib/actions";
import type { Dict } from "@/lib/i18n";

export function ChipSearch({ lang, t }: { lang: string; t: Dict }) {
  const [state, action, pending] = useActionState<FormState, FormData>(searchChip.bind(null, lang), null);
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="chip">{t.me.chipSearch}</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="chip" name="chip" type="search" inputMode="numeric" placeholder={t.me.chipPlaceholder} required />
          <button className="btn" type="submit" disabled={pending}>
            {t.me.chipSearch.split(" ")[0]}
          </button>
        </div>
      </div>
      {state?.error && (
        <p className="notice notice-error" role="alert">
          {state.error === "forbidden" ? t.common.errorForbidden : t.me.chipNotFound}
        </p>
      )}
    </form>
  );
}

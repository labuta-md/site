"use client";

import { useActionState, useState } from "react";
import { createReport, type FormState } from "@/lib/actions";
import type { Dict } from "@/lib/i18n";
import { SPECIES } from "@/lib/types";

export function ReportForm({ lang, t, initialKind }: { lang: string; t: Dict; initialKind: "lost" | "found" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createReport.bind(null, lang), null);
  const [kind, setKind] = useState(initialKind);
  const r = t.report;

  if (state?.ok) {
    return (
      <p className="notice notice-ok" role="status">
        {r.done}
      </p>
    );
  }

  return (
    <form action={action} className="form">
      <div className="field">
        <span className="label" id="kind-label">
          {r.kind}
        </span>
        <div className="choices" role="radiogroup" aria-labelledby="kind-label">
          {(["found", "lost"] as const).map((k) => (
            <label className="choice" key={k}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
              <span>{k === "found" ? r.titleFound : r.titleLost}</span>
            </label>
          ))}
        </div>
        {kind === "lost" && <span className="hint">{r.registeredHint}</span>}
      </div>
      <div className="field">
        <span className="label" id="species-label">
          {t.petForm.species}
        </span>
        <div className="choices" role="radiogroup" aria-labelledby="species-label">
          {SPECIES.map((s, i) => (
            <label className="choice" key={s}>
              <input type="radio" name="species" value={s} defaultChecked={i === 0} />
              <span>{t.species[s]}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">{r.description}</label>
        <textarea
          id="description"
          name="description"
          required
          maxLength={1000}
          placeholder={kind === "found" ? r.descriptionPlaceholderFound : r.descriptionPlaceholderLost}
        />
      </div>
      <div className="field">
        <label htmlFor="photo">
          {t.petForm.photo} <span className="opt">({t.common.optional})</span>
        </label>
        <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="city">{t.petForm.city}</label>
          <input id="city" name="city" type="text" maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="area">{t.petForm.area}</label>
          <input id="area" name="area" type="text" maxLength={160} />
        </div>
        <div className="field">
          <label htmlFor="seen_on">{r.seenOn}</label>
          <input id="seen_on" name="seen_on" type="date" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="reporter_contact">{r.contact}</label>
        <input id="reporter_contact" name="reporter_contact" type="text" required maxLength={100} />
        <span className="hint">{r.contactHint}</span>
      </div>
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state?.error && (
        <p className="notice notice-error" role="alert">
          {state.error === "photoTooBig"
            ? t.common.photoTooBig
            : state.error === "photoWrongType"
              ? t.common.photoWrongType
              : t.common.errorGeneric}
        </p>
      )}
      <div>
        <button className="btn" type="submit" disabled={pending}>
          {r.submit}
        </button>
      </div>
    </form>
  );
}

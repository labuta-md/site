"use client";

import { useActionState } from "react";
import { saveProfile, type FormState } from "@/lib/actions";
import { LOCALE_NAMES, LOCALES, type Dict } from "@/lib/i18n";
import { keepFormOnSubmit } from "@/components/useKeepForm";
import { REQUESTABLE_ROLES, type Profile } from "@/lib/types";

export function ProfileForm({ lang, t, user }: { lang: string; t: Dict; user: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile.bind(null, lang), null);
  const isOrg = user.role === "vet" || user.role === "shelter" || user.role === "organization";

  return (
    <form action={action} onSubmit={keepFormOnSubmit(action)} className="form">
      <p className="notice">{t.profile.privateNote}</p>
      <div className="field">
        <label htmlFor="display_name">
          {t.profile.displayName} <span className="opt">({t.common.optional})</span>
        </label>
        <input id="display_name" name="display_name" type="text" defaultValue={user.display_name ?? ""} autoComplete="name" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="city">{t.profile.city}</label>
          <input id="city" name="city" type="text" defaultValue={user.city ?? ""} placeholder={t.profile.cityPlaceholder} />
        </div>
        <div className="field">
          <label htmlFor="phone">
            {t.profile.phone} <span className="opt">({t.common.optional})</span>
          </label>
          <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" placeholder="+373" />
        </div>
      </div>
      <div className="field">
        <label className="check">
          <input type="checkbox" name="allow_phone_contact" defaultChecked={user.allow_phone_contact} />
          <span>{t.profile.allowPhone}</span>
        </label>
        <span className="hint">{t.profile.allowPhoneHint}</span>
      </div>

      <fieldset>
        <legend>{t.profile.roleTitle}</legend>
        <p className="small muted" style={{ margin: 0 }}>
          {t.profile.roleHint}
        </p>
        <p style={{ margin: 0 }}>
          {t.profile.roleCurrent.replace("{role}", t.roles[user.role])}
        </p>
        {user.role !== "moderator" && (
          <div className="field">
            <label htmlFor="requested_role">{t.profile.roleRequest}</label>
            <select id="requested_role" name="requested_role" defaultValue={user.requested_role ?? ""}>
              <option value="">{t.profile.roleNone}</option>
              {REQUESTABLE_ROLES.filter((r) => r !== user.role).map((r) => (
                <option key={r} value={r}>
                  {t.roles[r]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="org_name">
            {t.profile.orgName} {!isOrg && <span className="opt">({t.common.optional})</span>}
          </label>
          <input id="org_name" name="org_name" type="text" defaultValue={user.org_name ?? ""} />
          <span className="hint">{t.profile.orgNameHint}</span>
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="locale">{t.profile.language}</label>
        <select id="locale" name="locale" defaultValue={user.locale}>
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </div>

      {state?.ok && (
        <p className="notice notice-ok" role="status">
          {t.profile.saved}
        </p>
      )}
      {state?.error && (
        <p className="notice notice-error" role="alert">
          {t.common.errorGeneric}
        </p>
      )}
      <div>
        <button className="btn" type="submit" disabled={pending}>
          {t.common.save}
        </button>
      </div>
    </form>
  );
}

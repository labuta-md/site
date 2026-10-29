"use client";

import { useActionState, useState } from "react";
import { showOwnerContact, type FormState } from "@/lib/actions";
import type { Dict } from "@/lib/i18n";
import type { Role } from "@/lib/types";

type Person = {
  role: Role;
  name: string | null;
  org: string | null;
  email: string;
  city: string | null;
  phone: string | null;
  allow_phone_contact: boolean;
} | null;

function PersonCard({ title, p, t }: { title: string; p: Person; t: Dict }) {
  if (!p) return null;
  const a = t.admin;
  return (
    <div className="notice small" style={{ marginTop: 8 }}>
      <strong>
        {title}: {p.org || p.name || "—"}
      </strong>{" "}
      ({t.roles[p.role]})
      <br />
      {a.email}: <a href={`mailto:${p.email}`}>{p.email}</a>
      {p.city && (
        <>
          <br />
          {p.city}
        </>
      )}
      <br />
      {p.allow_phone_contact ? (
        <>
          {a.phoneAllowed}: {p.phone ? <a href={`tel:${p.phone}`}>{p.phone}</a> : "—"}
        </>
      ) : (
        <>
          {p.phone ? `${t.profile.phone}: ${p.phone}. ` : ""}
          {a.phoneNotAllowed}
        </>
      )}
    </div>
  );
}

export function ContactReveal({ lang, petId, t }: { lang: string; petId: string; t: Dict }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(showOwnerContact.bind(null, lang, petId), null);
  const a = t.admin;

  if (state?.ok && state.data) {
    const d = state.data as { owner: Person; creator: Person };
    return (
      <div>
        <PersonCard title={a.owner} p={d.owner} t={t} />
        <PersonCard title={a.creator} p={d.creator} t={t} />
      </div>
    );
  }

  if (!open) {
    return (
      <button className="link-button small" type="button" onClick={() => setOpen(true)}>
        {a.showContact}
      </button>
    );
  }

  return (
    <form action={action} className="form" style={{ gap: 8, minWidth: 220 }}>
      <label className="small" htmlFor={`reason-${petId}`}>
        {a.contactReason}
      </label>
      <input id={`reason-${petId}`} name="reason" type="text" required minLength={3} placeholder={a.contactReasonPlaceholder} />
      <div>
        <button className="btn btn-small" type="submit" disabled={pending}>
          {a.showContact}
        </button>
      </div>
    </form>
  );
}

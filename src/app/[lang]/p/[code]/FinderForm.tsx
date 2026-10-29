"use client";

import { useActionState, useRef, useState } from "react";
import { sendFinderMessage, type FormState } from "@/lib/actions";
import type { Dict } from "@/lib/i18n";

export function FinderForm({ code, t }: { code: string; t: Dict }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendFinderMessage.bind(null, code), null);
  const location = useRef<HTMLInputElement>(null);
  const [locating, setLocating] = useState(false);
  const p = t.publicPet;

  if (state?.ok) {
    return (
      <p className="notice notice-ok" role="status">
        {state.message === "sentNoChannel" ? p.sentNoChannel : p.sent}
      </p>
    );
  }

  function fillMyLocation() {
    if (!navigator.geolocation || !location.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (location.current) {
          location.current.value = `https://maps.google.com/?q=${latitude.toFixed(5)},${longitude.toFixed(5)}`;
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="message">{p.message}</label>
        <textarea id="message" name="message" required maxLength={1000} placeholder={p.messagePlaceholder} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="finder_name">
            {p.yourName} <span className="opt">({t.common.optional})</span>
          </label>
          <input id="finder_name" name="finder_name" type="text" autoComplete="name" maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="finder_phone">
            {p.yourPhone} <span className="opt">({t.common.optional})</span>
          </label>
          <input id="finder_phone" name="finder_phone" type="tel" autoComplete="tel" placeholder="+373" maxLength={32} />
          <span className="hint">{p.yourPhoneHint}</span>
        </div>
      </div>
      <div className="field">
        <label htmlFor="location_text">
          {p.location} <span className="opt">({t.common.optional})</span>
        </label>
        <input id="location_text" name="location_text" type="text" ref={location} placeholder={p.locationPlaceholder} maxLength={200} />
        <div>
          <button type="button" className="link-button small" onClick={fillMyLocation} disabled={locating}>
            {p.useLocation}
          </button>
        </div>
      </div>
      {/* Hidden from people, tempting for bots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state?.error && (
        <p className="notice notice-error" role="alert">
          {state.error === "rateLimited" ? p.rateLimited : state.error === "empty" ? p.empty : t.common.errorGeneric}
        </p>
      )}
      <div>
        <button className="btn btn-tag" type="submit" disabled={pending}>
          {p.send}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { savePet, type FormState } from "@/lib/actions";
import type { Dict } from "@/lib/i18n";
import { keepFormOnSubmit } from "@/components/useKeepForm";
import { PET_STATUSES, SEXES, SPECIES, type Pet, type PetStatus } from "@/lib/types";

function Opt({ t }: { t: Dict }) {
  return <span className="opt">({t.common.optional})</span>;
}

function YesNo({ name, value, t }: { name: string; value: boolean | null; t: Dict }) {
  const current = value === true ? "yes" : value === false ? "no" : "";
  return (
    <div className="choices">
      {[
        ["yes", t.common.yes],
        ["no", t.common.no],
        ["", t.common.unknown],
      ].map(([v, label]) => (
        <label className="choice" key={v}>
          <input type="radio" name={name} value={v} defaultChecked={current === v} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

export function PetForm({
  lang,
  t,
  pet,
  canCaretake,
  defaultCity,
}: {
  lang: string;
  t: Dict;
  pet: Pet | null;
  canCaretake: boolean;
  defaultCity: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePet.bind(null, lang, pet?.id ?? null), null);
  const [status, setStatus] = useState<PetStatus>(pet?.status ?? "home");
  const caretakerOnly = (s: PetStatus) => s === "street" || s === "foster" || s === "adoption";
  const f = t.petForm;
  const errorText =
    state?.error === "photoTooBig"
      ? t.common.photoTooBig
      : state?.error === "photoWrongType"
        ? t.common.photoWrongType
        : state?.error === "forbidden"
          ? t.common.errorForbidden
          : t.common.errorGeneric;

  return (
    <form action={action} onSubmit={keepFormOnSubmit(action)} className="form">
      <fieldset>
        <legend>{f.sectionMain}</legend>
        <div className="field">
          <span className="label" id="species-label">
            {f.species}
          </span>
          <div className="choices" role="radiogroup" aria-labelledby="species-label">
            {SPECIES.map((s) => (
              <label className="choice" key={s}>
                <input type="radio" name="species" value={s} defaultChecked={(pet?.species ?? "dog") === s} />
                <span>{t.species[s]}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="name">{f.name}</label>
          <input id="name" name="name" type="text" defaultValue={pet?.name ?? ""} placeholder={f.namePlaceholder} maxLength={60} />
        </div>
        <div className="field">
          <span className="label" id="status-label">
            {f.status}
          </span>
          <div className="choices" role="radiogroup" aria-labelledby="status-label">
            {PET_STATUSES.map((s) => (
              <label className="choice" key={s}>
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  disabled={!canCaretake && caretakerOnly(s)}
                />
                <span>{t.status[s]}</span>
              </label>
            ))}
          </div>
          <span className="hint">{t.statusHint[status]}</span>
          {!canCaretake && <span className="hint">{f.ownerOnlyStatuses}</span>}
        </div>
        {status === "lost" && (
          <div className="field">
            <label htmlFor="lost_area">{f.lostArea}</label>
            <input id="lost_area" name="lost_area" type="text" defaultValue={pet?.lost_area ?? ""} maxLength={160} />
          </div>
        )}
        <div className="field">
          <label htmlFor="photo">
            {f.photo} <Opt t={t} />
          </label>
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic" />
          <span className="hint">{f.photoHint}</span>
          {pet?.photo_url && (
            <label className="check small">
              <input type="checkbox" name="remove_photo" />
              <span>{f.removePhoto}</span>
            </label>
          )}
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="city">{f.city}</label>
            <input id="city" name="city" type="text" defaultValue={pet?.city ?? defaultCity ?? ""} maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="area">
              {f.area} <Opt t={t} />
            </label>
            <input
              id="area"
              name="area"
              type="text"
              defaultValue={pet?.area ?? ""}
              placeholder={caretakerOnly(status) ? f.areaPlaceholderStreet : f.areaPlaceholderHome}
              maxLength={160}
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>{f.sectionLooks}</legend>
        <div className="field">
          <span className="label" id="sex-label">
            {f.sex}
          </span>
          <div className="choices" role="radiogroup" aria-labelledby="sex-label">
            {SEXES.map((s) => (
              <label className="choice" key={s}>
                <input type="radio" name="sex" value={s} defaultChecked={(pet?.sex ?? "unknown") === s} />
                <span>{t.sex[s]}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="color">
              {f.color} <Opt t={t} />
            </label>
            <input id="color" name="color" type="text" defaultValue={pet?.color ?? ""} maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="breed">
              {f.breed} <Opt t={t} />
            </label>
            <input id="breed" name="breed" type="text" defaultValue={pet?.breed ?? ""} placeholder={f.breedPlaceholder} maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="birth_year">
              {f.birthYear} <Opt t={t} />
            </label>
            <input id="birth_year" name="birth_year" type="number" inputMode="numeric" min={1990} max={2100} defaultValue={pet?.birth_year ?? ""} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="special_marks">
            {f.specialMarks} <Opt t={t} />
          </label>
          <input id="special_marks" name="special_marks" type="text" defaultValue={pet?.special_marks ?? ""} placeholder={f.specialMarksPlaceholder} maxLength={500} />
        </div>
      </fieldset>

      <fieldset>
        <legend>{f.sectionHealth}</legend>
        <div className="field">
          <span className="label">{f.sterilized}</span>
          <YesNo name="sterilized" value={pet?.sterilized ?? null} t={t} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="rabies_date">
              {f.rabies} <Opt t={t} />
            </label>
            <input id="rabies_date" name="rabies_date" type="date" defaultValue={pet?.rabies_date ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="chip_number">
              {f.chip} <Opt t={t} />
            </label>
            <input id="chip_number" name="chip_number" type="text" inputMode="numeric" defaultValue={pet?.chip_number ?? ""} maxLength={32} />
            <span className="hint">{f.chipHint}</span>
          </div>
          <div className="field">
            <label htmlFor="ear_tag">
              {f.earTag} <Opt t={t} />
            </label>
            <input id="ear_tag" name="ear_tag" type="text" defaultValue={pet?.ear_tag ?? ""} maxLength={32} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>{f.sectionFinder}</legend>
        <div className="field">
          <label htmlFor="finder_notes">
            {f.finderNotes} <Opt t={t} />
          </label>
          <textarea id="finder_notes" name="finder_notes" defaultValue={pet?.finder_notes ?? ""} placeholder={f.finderNotesPlaceholder} maxLength={500} />
        </div>
      </fieldset>

      <fieldset>
        <legend>{f.sectionPrivate}</legend>
        <div className="field">
          <label htmlFor="private_notes">
            {f.privateNotes} <Opt t={t} />
          </label>
          <textarea id="private_notes" name="private_notes" defaultValue={pet?.private_notes ?? ""} maxLength={2000} />
          <span className="hint">{f.privateNotesHint}</span>
        </div>
      </fieldset>

      {state?.error && (
        <p className="notice notice-error" role="alert">
          {errorText}
        </p>
      )}
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pet ? f.submitEdit : f.submitNew}
        </button>
      </div>
    </form>
  );
}

import { formatDate, type Dict } from "@/lib/i18n";
import type { Pet, PublicPet } from "@/lib/types";
import { SpeciesIcon } from "./Animal";

export function PetPhoto({ pet, alt }: { pet: Pick<PublicPet, "photo_url" | "species">; alt: string }) {
  return pet.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="pet-photo" src={pet.photo_url} alt={alt} />
  ) : (
    <div className="pet-photo placeholder muted">
      <SpeciesIcon species={pet.species} size={96} />
    </div>
  );
}

/** Facts about an animal. Private fields only when `showPrivate` and the data is the full Pet. */
export function PetDetails({
  pet,
  t,
  lang,
  showPrivate = false,
}: {
  pet: PublicPet | Pet;
  t: Dict;
  lang: string;
  showPrivate?: boolean;
}) {
  const f = t.petForm;
  const rows: [string, React.ReactNode][] = [];
  rows.push([f.species, t.species[pet.species]]);
  if (pet.sex !== "unknown") rows.push([f.sex, t.sex[pet.sex]]);
  if (pet.birth_year) rows.push([f.birthYear, String(pet.birth_year)]);
  if (pet.color) rows.push([f.color, pet.color]);
  if (pet.breed) rows.push([f.breed, pet.breed]);
  if (pet.special_marks) rows.push([f.specialMarks, pet.special_marks]);
  if (pet.city || pet.area) rows.push([f.area, [pet.city, pet.area].filter(Boolean).join(", ")]);
  if (pet.sterilized !== null) rows.push([f.sterilized, pet.sterilized ? t.common.yes : t.common.no]);
  if (pet.rabies_date) rows.push([f.rabies, formatDate(pet.rabies_date, lang)]);
  if (pet.ear_tag) rows.push([f.earTag, pet.ear_tag]);
  if (showPrivate && "chip_number" in pet) {
    if (pet.finder_notes) rows.push([f.finderNotes, pet.finder_notes]);
    rows.push([f.chip, pet.chip_number || t.common.notSpecified]);
    if (pet.private_notes) rows.push([f.privateNotes, pet.private_notes]);
  }

  return (
    <dl className="facts">
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { deletePet } from "@/lib/actions";
import { getDict } from "@/lib/i18n";
import { canRegisterWithoutOwner } from "@/lib/permissions";
import { getStore } from "@/lib/store";
import { PetForm } from "../../PetForm";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function EditPet({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang);
  const pet = await getStore().getEditablePet(user.id, id);
  if (!pet) notFound();

  return (
    <div className="wrap narrow stack">
      <h1>{t.petForm.titleEdit}</h1>
      <PetForm lang={lang} t={t} pet={pet} canCaretake={canRegisterWithoutOwner(user)} defaultCity={user.city} />
      <form action={deletePet.bind(null, lang, pet.id)} className="section">
        <ConfirmButton className="btn btn-danger btn-small" confirm={t.petForm.deleteConfirm}>
          {t.common.delete}
        </ConfirmButton>
      </form>
    </div>
  );
}

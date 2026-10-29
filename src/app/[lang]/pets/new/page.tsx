import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { canRegisterWithoutOwner } from "@/lib/permissions";
import { PetForm } from "../PetForm";

export default async function NewPet({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const user = await requireUser(lang);
  return (
    <div className="wrap narrow stack">
      <h1>{t.petForm.titleNew}</h1>
      <PetForm lang={lang} t={t} pet={null} canCaretake={canRegisterWithoutOwner(user)} defaultCity={user.city} />
    </div>
  );
}

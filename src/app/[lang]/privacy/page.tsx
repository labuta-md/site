import { getDict } from "@/lib/i18n";

export default async function Privacy({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  return (
    <div className="wrap narrow">
      <h1>{t.privacy.title}</h1>
      {t.privacy.paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}

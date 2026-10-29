import { getDict } from "@/lib/i18n";
import { ReportForm } from "./ReportForm";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { lang } = await params;
  const { kind } = await searchParams;
  const t = getDict(lang);
  const k = kind === "lost" ? "lost" : "found";
  return (
    <div className="wrap narrow stack">
      <h1>{k === "lost" ? t.report.titleLost : t.report.titleFound}</h1>
      <ReportForm lang={lang} t={t} initialKind={k} />
    </div>
  );
}

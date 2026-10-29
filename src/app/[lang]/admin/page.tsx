import Link from "next/link";
import { StatusPill } from "@/components/Animal";
import { requireModerator } from "@/lib/auth";
import { decideRole, setReportStatus, setRole } from "@/lib/actions";
import { fmt, formatDate, getDict } from "@/lib/i18n";
import { getStore } from "@/lib/store";
import { ROLES } from "@/lib/types";
import { ContactReveal } from "./ContactReveal";

const TABS = ["pets", "reports", "roles", "users", "log"] as const;
type Tab = (typeof TABS)[number];

export default async function Admin({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { lang } = await params;
  const { tab: rawTab } = await searchParams;
  const t = getDict(lang);
  const a = t.admin;
  const mod = await requireModerator(lang);
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "pets";
  const admin = getStore().admin;
  const tabLabel: Record<Tab, string> = {
    pets: a.tabPets,
    reports: a.tabReports,
    roles: a.tabRoles,
    users: a.tabUsers,
    log: a.tabLog,
  };

  return (
    <div className="wrap">
      <h1>{a.title}</h1>
      <nav className="tabs">
        {TABS.map((x) => (
          <Link key={x} href={`/${lang}/admin?tab=${x}`} aria-current={x === tab ? "page" : undefined}>
            {tabLabel[x]}
          </Link>
        ))}
      </nav>

      {tab === "pets" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.petForm.name}</th>
                <th>{t.petPage.code}</th>
                <th>{t.petForm.status}</th>
                <th>{t.petForm.area}</th>
                <th>{a.contactTitle}</th>
              </tr>
            </thead>
            <tbody>
              {(await admin.listPets(mod.id)).map((p) => (
                <tr key={p.id}>
                  <td>
                    {t.species[p.species]}: {p.name || "—"}
                  </td>
                  <td>
                    <Link href={`/${lang}/p/${p.public_code}`}>{p.public_code}</Link>
                    <br />
                    <Link className="small" href={`/${lang}/pets/${p.id}/edit`}>
                      {t.petPage.edit}
                    </Link>
                  </td>
                  <td>
                    <StatusPill status={p.status} t={t} />
                  </td>
                  <td>{[p.city, p.area].filter(Boolean).join(", ")}</td>
                  <td>
                    <ContactReveal lang={lang} petId={p.id} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "reports" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.report.kind}</th>
                <th>{t.report.description}</th>
                <th>{a.reporterContact}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(await admin.listReports(mod.id)).map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.kind === "found" ? t.lostFound.foundLabel : t.lostFound.lostLabel}, {t.species[r.species]}
                    <br />
                    <span className="small muted">
                      {formatDate(r.created_at, lang)}, {r.status === "open" ? a.open : a.resolved}
                    </span>
                  </td>
                  <td>
                    {r.description}
                    <br />
                    <span className="small muted">{[r.city, r.area].filter(Boolean).join(", ")}</span>
                  </td>
                  <td>{r.reporter_contact || "—"}</td>
                  <td>
                    <form action={setReportStatus.bind(null, lang, r.id, r.status === "open" ? "resolved" : "open")}>
                      <button className="btn btn-outline btn-small" type="submit">
                        {r.status === "open" ? a.resolve : a.reopen}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "roles" && <RoleRequests lang={lang} modId={mod.id} />}

      {tab === "users" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.admin.email}</th>
                <th>{t.profile.displayName}</th>
                <th>{a.setRole}</th>
              </tr>
            </thead>
            <tbody>
              {(await admin.listUsers(mod.id)).map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.org_name || u.display_name || "—"}</td>
                  <td>
                    <form action={setRole.bind(null, lang, u.id)} style={{ display: "flex", gap: 6 }}>
                      <select name="role" defaultValue={u.role} aria-label={a.setRole} style={{ minHeight: 36, padding: "4px 8px" }}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t.roles[r]}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-outline btn-small" type="submit">
                        {t.common.save}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "log" && <AccessLog lang={lang} modId={mod.id} />}
    </div>
  );

  async function RoleRequests({ lang, modId }: { lang: string; modId: string }) {
    const list = await admin.listRoleRequests(modId);
    if (list.length === 0) return <p className="muted">{a.noRoleRequests}</p>;
    return (
      <ul className="message-list">
        {list.map((u) => (
          <li key={u.id}>
            <p style={{ marginBottom: 8 }}>
              <strong>{u.org_name || u.display_name || u.email}</strong> ({u.email}){" "}
              {fmt(a.requests, { role: t.roles[u.requested_role!] })}
              {u.city ? `, ${u.city}` : ""}
            </p>
            <div className="btn-row">
              <form action={decideRole.bind(null, lang, u.id, true)}>
                <button className="btn btn-small" type="submit">
                  {a.approve}
                </button>
              </form>
              <form action={decideRole.bind(null, lang, u.id, false)}>
                <button className="btn btn-outline btn-small" type="submit">
                  {a.reject}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  async function AccessLog({ lang, modId }: { lang: string; modId: string }) {
    const [log, users, pets] = await Promise.all([admin.listContactAccess(modId), admin.listUsers(modId), admin.listPets(modId)]);
    if (log.length === 0) return <p className="muted">{a.logEmpty}</p>;
    const who = new Map(users.map((u) => [u.id, u.display_name || u.email]));
    const pet = new Map(pets.map((p) => [p.id, p]));
    return (
      <div className="table-wrap">
        <table>
          <tbody>
            {log.map((l) => {
              const p = pet.get(l.pet_id);
              return (
                <tr key={l.id}>
                  <td>{formatDate(l.created_at, lang)}</td>
                  <td>{who.get(l.moderator_id)}</td>
                  <td>{p ? <Link href={`/${lang}/p/${p.public_code}`}>{p.name || p.public_code}</Link> : "—"}</td>
                  <td>{l.reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

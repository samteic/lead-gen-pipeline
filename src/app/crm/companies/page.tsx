import Link from "next/link";
import styles from "@/app/crm/crm.module.css";
import { Flash } from "@/app/crm/flash";
import { createCompany } from "@/app/crm/company-actions";
import { requireUser } from "@/lib/auth";
import { loadCompanyList } from "@/lib/crm/load-companies";
import { day, label } from "@/lib/crm/format";

export const metadata = {
  title: "Companies Directory · Lead Intelligence Platform",
  robots: { index: false, follow: false },
};

function priorityClass(priority: string | null): string {
  if (priority === "HIGH") return styles.badgeGood;
  if (priority === "MEDIUM") return styles.badgeWarn;
  if (priority === "REJECT") return styles.badgeBad;
  return "";
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string; ok?: string; error?: string }>;
}) {
  await requireUser();
  const { q, archived, ok, error } = await searchParams;

  const search = typeof q === "string" ? q.slice(0, 100) : "";
  const showArchived = archived === "1";
  const { rows, limited } = await loadCompanyList(search, showArchived);

  const highFit = rows.filter((r) => r.priority === "HIGH").length;
  const totalContacts = rows.reduce((sum, r) => sum + r.contactCount, 0);
  const totalOpenDeals = rows.reduce((sum, r) => sum + r.openDeals, 0);

  return (
    <>
      <div className={styles.pageHeaderRow}>
        <div className={styles.pageHeaderText}>
          <div className={styles.pageKicker}>
            <span className={styles.liveDot} />
            <span>Directory</span>
          </div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>
            Companies
          </h1>
          <p className={styles.muted} style={{ margin: "4px 0 0" }}>
            All cleaned companies, contacts, and fit scores in one place.
          </p>
        </div>

        <div className={styles.pageActions}>
          <a href="/crm/export/companies" className={`${styles.buttonSecondary} ${styles.buttonSmall}`}>
            Export CSV ↓
          </a>
          <Link href="/crm/prospects" className={`${styles.buttonPrimary} ${styles.buttonSmall}`}>
            Import / Audit →
          </Link>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      <section className={styles.statGrid} aria-label="Company directory metrics">
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Indexed Accounts</span>
          <span className={styles.statValue}>{rows.length}</span>
          <span className={styles.statHint}>{limited ? "Showing newest 100" : "Canonical domains deduplicated"}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>High-Priority Fits</span>
          <span className={styles.statValue}>{highFit}</span>
          <span className={styles.statHint}>Scored &ge;80 by qualification engine</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Linked Contacts</span>
          <span className={styles.statValue}>{totalContacts}</span>
          <span className={styles.statHint}>Decision makers indexed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active Opportunities</span>
          <span className={styles.statValue}>{totalOpenDeals}</span>
          <span className={styles.statHint}>Routed into pipeline</span>
        </div>
      </section>

      <section className={styles.panel}>
        <form method="get" className={styles.searchBox}>
          <input
            name="q"
            defaultValue={search}
            placeholder="Filter by company name or canonical domain..."
            className={styles.input}
          />
          <label className={styles.muted} style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, margin: 0, fontSize: 13 }}>
            <input type="checkbox" name="archived" value="1" defaultChecked={showArchived} /> Show archived
          </label>
          <button type="submit" className={styles.buttonSecondary}>
            Search
          </button>
        </form>

        <details>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>
            + Add company manually (runs deduplication check)
          </summary>
          <form action={createCompany} style={{ marginTop: 12 }}>
            <input type="hidden" name="returnTo" value="/crm/companies" />

            <label className={styles.label}>
              Company name
              <input name="name" required maxLength={200} className={styles.input} placeholder="e.g. Acme Robotics Inc." />
            </label>

            <div className={styles.formGrid}>
              <label className={styles.label}>
                Website
                <input name="website" placeholder="acmerobotics.io" maxLength={300} className={styles.input} />
              </label>
              <label className={styles.label}>
                Industry
                <input name="industry" maxLength={120} className={styles.input} placeholder="Cloud Infrastructure" />
              </label>
              <label className={styles.label}>
                Location
                <input name="location" maxLength={120} className={styles.input} placeholder="San Francisco, CA" />
              </label>
              <label className={styles.label}>
                Employees
                <input name="employeeCount" type="number" min="0" step="1" className={styles.input} placeholder="120" />
              </label>
            </div>

            <label className={styles.muted} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12.5 }}>
              <input type="checkbox" name="confirmDuplicate" /> Override similarity warning if distinct entity
            </label>

            <div className={styles.formRow}>
              <button type="submit" className={styles.buttonPrimary}>
                Add company
              </button>
            </div>
          </form>
        </details>
      </section>

      <section className={styles.panel}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>No companies match your current filter.</div>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Domain</th>
                  <th>Industry</th>
                  <th>Location</th>
                  <th>Contacts</th>
                  <th>Open Deals</th>
                  <th>Qualification</th>
                  <th>Source</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/crm/companies/${r.id}`}>{r.name}</Link>{" "}
                      {r.status === "archived" && <span className={`${styles.badge} ${styles.badgeWarn}`}>archived</span>}
                    </td>
                    <td style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12.5 }}>{r.domain ?? "—"}</td>
                    <td>{r.industry ?? "—"}</td>
                    <td className={styles.muted}>{r.location ?? "—"}</td>
                    <td>{r.contactCount}</td>
                    <td>{r.openDeals}</td>
                    <td>
                      {r.priority ? (
                        <span className={`${styles.badge} ${priorityClass(r.priority)}`}>{r.priority}</span>
                      ) : (
                        <span className={styles.muted}>unscored</span>
                      )}
                    </td>
                    <td className={styles.muted}>{r.source ? label(r.source) : "—"}</td>
                    <td className={styles.muted}>{day(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

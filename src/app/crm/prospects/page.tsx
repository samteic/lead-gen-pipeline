import Link from "next/link";
import styles from "@/app/crm/crm.module.css";
import { Flash } from "@/app/crm/flash";
import { enrichProspects } from "@/app/crm/prospect-actions";
import { ImportForm } from "./import-form";
import { SubmitButton } from "@/app/crm/submit-button";
import { requireUser } from "@/lib/auth";
import { loadProspectTable, PROSPECT_WINDOW } from "@/lib/crm/load-prospects";
import { day, label } from "@/lib/crm/format";

export const metadata = {
  title: "Prospects & Signal Audit · Lead Intelligence Platform",
  robots: { index: false, follow: false },
};

function scoreClass(score: number): string {
  if (score >= 50) return styles.badgeGood;
  if (score >= 20) return styles.badgeWarn;
  return "";
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireUser();
  const { ok, error } = await searchParams;
  const table = await loadProspectTable();
  const highGapCount = table.scored.filter((p) => p.score >= 50).length;

  return (
    <>
      <div className={styles.pageHeaderRow}>
        <div className={styles.pageHeaderText}>
          <div className={styles.pageKicker}>
            <span className={styles.liveDot} />
            <span>Import &amp; Website Audit</span>
          </div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>
            Prospects
          </h1>
          <p className={styles.muted} style={{ margin: "4px 0 0" }}>
            Import companies, spot website gaps, and export clean lead lists.
          </p>
        </div>

        <div className={styles.pageActions}>
          <a href="/crm/export/prospects" className={`${styles.buttonSecondary} ${styles.buttonSmall}`}>
            Export CSV ↓
          </a>
          <Link href="/crm/pipeline" className={`${styles.buttonPrimary} ${styles.buttonSmall}`}>
            Open Pipeline →
          </Link>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      {/* Summary KPI Strip */}
      <section className={styles.statGrid} aria-label="Prospect pipeline metrics">
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Audited Prospects</span>
          <span className={styles.statValue}>{table.scored.length}</span>
          <span className={styles.statHint}>Website signals extracted</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>High Opportunity (&ge;50)</span>
          <span className={styles.statValue}>{highGapCount}</span>
          <span className={styles.statHint}>Multiple detected website gaps</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Awaiting Audit</span>
          <span className={styles.statValue}>{table.waiting.length}</span>
          <span className={styles.statHint}>Queued for enrichment batch</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Unreachable Sites</span>
          <span className={styles.statValue}>{table.failed.length}</span>
          <span className={styles.statHint}>Retried automatically after 7 days</span>
        </div>
      </section>

      {/* Ranked Prospects Table */}
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.panelTitle} style={{ margin: 0 }}>
              Ranked Prospects ({table.scored.length})
            </h2>
          </div>
          <span className={styles.sectionMeta}>Deterministic Website Signal Score</span>
        </div>

        {table.scored.length === 0 ? (
          <div className={styles.emptyState}>
            No prospects have been audited yet. Import companies with websites below, then run an enrichment batch.
          </div>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 42 }}>#</th>
                  <th>Company</th>
                  <th>Domain</th>
                  <th style={{ width: 100 }}>Gap Score</th>
                  <th>Contact Signals</th>
                  <th>Detected Gaps</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {table.scored.map((p, i) => (
                  <tr key={p.id}>
                    <td className={styles.muted} style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                      {i + 1}
                    </td>
                    <td>
                      <Link href={`/crm/companies/${p.id}`}>{p.name}</Link>
                    </td>
                    <td style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12.5 }}>{p.domain}</td>
                    <td>
                      <span className={`${styles.badge} ${scoreClass(p.score)}`}>{p.score}/100</span>
                    </td>
                    <td className={styles.muted}>{p.contact}</td>
                    <td>
                      <div className={styles.chipList}>
                        {p.gaps.length > 0 ? (
                          p.gaps.map((g) => (
                            <span key={g} className={styles.chip}>
                              {label(g)}
                            </span>
                          ))
                        ) : (
                          <span className={styles.chip}>no gaps detected</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.muted}>{p.source ? label(p.source) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className={styles.muted} style={{ fontSize: 12, marginTop: 12 }}>
          Higher scores mean more website gaps found (missing descriptions, thin text, free subdomains, or missing contact details).
          {table.limited ? ` Showing the newest ${PROSPECT_WINDOW} companies.` : ""}
        </p>
      </section>

      {/* Two-Column Operations Grid: Ingestion & Enrichment */}
      <div className={styles.twoColSplit}>
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2 className={styles.panelTitle} style={{ margin: 0 }}>
              Import from CSV
            </h2>
            <span className={styles.sectionMeta}>Auto-cleans duplicates</span>
          </div>
          <p className={styles.muted} style={{ fontSize: 13, marginBottom: 14 }}>
            Upload any B2B spreadsheet. Columns are matched automatically and duplicates are skipped.
          </p>
          <ImportForm />
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2 className={styles.panelTitle} style={{ margin: 0 }}>
              Check Websites
            </h2>
            <span className={styles.sectionMeta}>{table.waiting.length} waiting</span>
          </div>
          <p className={styles.muted} style={{ fontSize: 13, marginBottom: 14 }}>
            Scans up to 5 queued company websites to pull business details and contact info.
          </p>
          <form action={enrichProspects} className={styles.formRow}>
            <select name="source" defaultValue="" className={styles.select} style={{ width: "auto", minWidth: 160 }}>
              <option value="">All sources</option>
              {table.waitingSources.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
            <SubmitButton
              label="Run Enrichment Batch (5)"
              pendingLabel="Auditing websites..."
              className={styles.buttonSecondary}
              disabled={table.waiting.length === 0}
            />
          </form>

          {table.failed.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
                Unreachable Domains ({table.failed.length})
              </div>
              <ul className={styles.list}>
                {table.failed.slice(0, 6).map((f) => (
                  <li key={f.id} className={styles.listItem} style={{ fontSize: 12.5 }}>
                    <Link href={`/crm/companies/${f.id}`}>{f.name}</Link>{" "}
                    <span className={styles.muted}>
                      · {f.domain} · checked {day(f.attemptedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Structured Data Exports (Formula-Injection Safe CSVs) */}
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.panelTitle} style={{ margin: 0 }}>
            Download CSV Lists
          </h2>
          <span className={styles.sectionMeta}>Works live in demo</span>
        </div>
        <p className={styles.muted} style={{ fontSize: 13, marginBottom: 14 }}>
          Export clean, ready-to-share spreadsheets straight from the database.
        </p>
        <div className={styles.exportGrid}>
          {[
            ["prospects", "Ranked Prospects", "Scored, waiting & failed audit rows"],
            ["companies", "All Companies", "Normalized domains, industry & size"],
            ["contacts", "Verified Contacts", "Roles, verification & compliance flags"],
            ["deals", "Pipeline Opportunities", "Stages, estimated & actual values"],
            ["tasks", "Follow-Up Tasks", "Priorities, assignees & due dates"],
          ].map(([kind, title, desc]) => (
            <a key={kind} href={`/crm/export/${kind}`} className={styles.exportCard}>
              <div>
                <div style={{ fontWeight: 600 }}>{title}</div>
                <div className={styles.muted} style={{ fontSize: 11.5, marginTop: 2 }}>
                  {desc}
                </div>
              </div>
              <span className={styles.codePill}>.csv</span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

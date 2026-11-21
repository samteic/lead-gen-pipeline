import Link from "next/link";
import crmStyles from "@/app/crm/crm.module.css";
import styles from "./dashboard.module.css";
import { requireUser } from "@/lib/auth";
import { loadDashboardData, type CostSummary, type EvaluationSummary } from "@/lib/dashboard/load-dashboard-data";
import { loadFunnelDetails, type FunnelDetails, type FunnelStageKey } from "@/lib/dashboard/load-funnel-details";
import type { FullFunnel } from "@/lib/analytics/funnel";
import type { ProspectTable } from "@/lib/crm/load-prospects";
import { label } from "@/lib/crm/format";

export const metadata = {
  title: "Overview · Lead Intelligence",
  robots: { index: false, follow: false },
};

const usd = (value: number | null): string => (value === null ? "n/a" : `$${value.toFixed(2)}`);
const pct = (value: number | null): string => (value === null ? "n/a" : `${Math.round(value * 100)}%`);

function FunnelSection({ funnel, details }: { funnel: FullFunnel | null; details: FunnelDetails | null }) {
  if (!funnel) return <p className={crmStyles.muted}>Funnel failed to load.</p>;

  const stages: Array<{ key: FunnelStageKey; name: string; value: number; link?: string }> = [
    { key: "discovered", name: "Discovered", value: funnel.discovered, link: "/crm/companies" },
    { key: "qualified", name: "Qualified", value: funnel.qualified, link: "/crm/prospects" },
    { key: "contactsFound", name: "Contacts found", value: funnel.contactsFound, link: "/crm/prospects" },
    { key: "verified", name: "Verified", value: funnel.verified, link: "/crm/prospects" },
    { key: "sent", name: "Sent", value: funnel.sent, link: "/crm/outreach" },
    { key: "delivered", name: "Delivered", value: funnel.delivered, link: "/crm/outreach" },
    { key: "replied", name: "Replied", value: funnel.replied, link: "/crm/outreach" },
    { key: "meetings", name: "Meetings booked", value: funnel.meetings, link: "/crm/pipeline" },
    { key: "opportunities", name: "Active deals", value: funnel.opportunities, link: "/crm/pipeline" },
    { key: "won", name: "Deals won", value: funnel.won, link: "/crm/pipeline" },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <>
      <div className={styles.funnelList}>
        {stages.map(({ key, name, value, link }) => {
          const records = details?.[key] ?? [];
          const percentage = Math.round((value / max) * 100);

          return (
            <div key={key} className={styles.funnelItem}>
              <div className={styles.funnelRow}>
                <span className={styles.stageName}>
                  {link ? (
                    <Link href={link} style={{ color: "inherit", textDecoration: "none" }}>
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${percentage}%` }} />
                </div>
                <span className={styles.barValue}>{value}</span>
              </div>

              {details && value > 0 && (
                <details className={styles.recordsDropdown}>
                  <summary className={styles.recordsSummary}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <span>View {records.length} {records.length === 1 ? "record" : "records"}</span>
                  </summary>
                  <ol className={styles.recordsList}>
                    {records.map((r, i) => (
                      <li key={i}>
                        <strong>{r.primary}</strong> — {r.secondary}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          );
        })}
      </div>
      <p className={styles.note}>
        Live counts from the database. Click any stage to inspect the records behind it.
      </p>
    </>
  );
}

function TopProspects({ prospects }: { prospects: ProspectTable | null }) {
  if (!prospects) return <p className={crmStyles.muted}>Prospects failed to load.</p>;
  const top = prospects.scored.slice(0, 8);

  if (top.length === 0) {
    return <p className={crmStyles.muted}>No scored prospects yet.</p>;
  }

  return (
    <>
      {/* Desktop / Tablet Table View */}
      <div className={styles.desktopTableContainer}>
        <table className={styles.prospectsTable}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Company</th>
              <th>Website</th>
              <th style={{ width: 110 }}>Fit Score</th>
              <th>Identified Signals</th>
            </tr>
          </thead>
          <tbody>
            {top.map((p, i) => {
              const initials = p.name.slice(0, 2).toUpperCase();
              return (
                <tr key={p.id}>
                  <td style={{ color: "var(--muted)", fontFamily: "var(--font-geist-mono), monospace" }}>{i + 1}</td>
                  <td>
                    <Link href={`/crm/companies/${p.id}`} className={styles.companyLink}>
                      <span className={styles.companyAvatar}>{initials}</span>
                      <span>{p.name}</span>
                    </Link>
                  </td>
                  <td>
                    {p.domain ? (
                      <a
                        href={p.domain.startsWith("http") ? p.domain : `https://${p.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.domainLink}
                        title={`Open ${p.domain}`}
                      >
                        <span>{p.domain}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    ) : (
                      <span className={crmStyles.muted}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.scorePill} ${p.score >= 85 ? styles.scorePillHigh : ""}`}>
                      {p.score}/100
                    </span>
                  </td>
                  <td>
                    <div className={styles.signalPills}>
                      {p.gaps.length > 0 ? (
                        p.gaps.map((g) => (
                          <span key={g} className={styles.signalChip}>
                            {label(g)}
                          </span>
                        ))
                      ) : (
                        <span className={styles.signalChip}>verified fit</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (Phone Screens) */}
      <div className={styles.mobileProspectsCards}>
        {top.map((p, i) => {
          const initials = p.name.slice(0, 2).toUpperCase();
          return (
            <div key={p.id} className={styles.mobileProspectCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardTitleWrap}>
                  <span className={styles.mobileCardRank}>#{i + 1}</span>
                  <span className={styles.companyAvatar}>{initials}</span>
                  <Link href={`/crm/companies/${p.id}`} className={styles.companyLink}>
                    {p.name}
                  </Link>
                </div>
                <span className={`${styles.scorePill} ${p.score >= 85 ? styles.scorePillHigh : ""}`}>
                  {p.score}/100
                </span>
              </div>

              {p.domain && (
                <div style={{ paddingLeft: 26 }}>
                  <a
                    href={p.domain.startsWith("http") ? p.domain : `https://${p.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.domainLink}
                  >
                    <span>{p.domain}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              )}

              <div className={styles.signalPills} style={{ paddingLeft: 26 }}>
                {p.gaps.length > 0 ? (
                  p.gaps.map((g) => (
                    <span key={g} className={styles.signalChip}>
                      {label(g)}
                    </span>
                  ))
                ) : (
                  <span className={styles.signalChip}>verified fit</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <Link href="/crm/prospects" className={styles.quickActionBtn}>
          <span>View all {prospects.scored.length} prospects</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </>
  );
}

function CostsCard({ costs }: { costs: CostSummary | null }) {
  if (!costs) return <p className={crmStyles.muted}>Costs failed to load.</p>;
  const e = costs.economics;

  return (
    <div className={styles.kvTable}>
      <div className={styles.kvRow}>
        <span className={styles.kvKey}>Total spend</span>
        <span className={styles.kvVal}>{usd(e.totalCost)}</span>
      </div>
      <div className={styles.kvRow}>
        <span className={styles.kvKey}>AI calls logged</span>
        <span className={styles.kvVal}>{costs.llmCalls} calls</span>
      </div>
      <div className={styles.kvRow}>
        <span className={styles.kvKey}>Cost per qualified lead</span>
        <span className={styles.kvVal}>{usd(e.costPerQualifiedLead)}</span>
      </div>
      <div className={styles.kvRow}>
        <span className={styles.kvKey}>Cost per meeting</span>
        <span className={styles.kvVal}>{usd(e.costPerMeeting)}</span>
      </div>
      <div className={styles.kvRow}>
        <span className={styles.kvKey}>Cost per customer won</span>
        <span className={styles.kvVal}>{usd(e.costPerCustomer)}</span>
      </div>
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: EvaluationSummary | null }) {
  if (!evaluation) return <p className={crmStyles.muted}>Evaluation failed to load.</p>;
  const s = evaluation.scoring;

  return (
    <>
      <div className={styles.kvTable}>
        <div className={styles.kvRow}>
          <span className={styles.kvKey}>Scoring accuracy</span>
          <span className={styles.kvVal}>{pct(s.accuracy)}</span>
        </div>
        <div className={styles.kvRow}>
          <span className={styles.kvKey}>Precision / Recall</span>
          <span className={styles.kvVal}>
            {pct(s.precision)} / {pct(s.recall)}
          </span>
        </div>
        <div className={styles.kvRow}>
          <span className={styles.kvKey}>Contact ranking</span>
          <span className={styles.kvVal}>
            {pct(evaluation.contactAccuracy)} ({evaluation.contactCases} tests)
          </span>
        </div>
        <div className={styles.kvRow}>
          <span className={styles.kvKey}>Safety checks</span>
          <span className={styles.kvVal} style={{ color: "var(--good)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {evaluation.regression.passed}/{evaluation.regression.total} passing
          </span>
        </div>
      </div>
      <p className={styles.note}>
        Tested on {s.samples - s.constructed} real reviewed companies + {s.constructed} test cases.
      </p>
    </>
  );
}

export default async function DashboardPage() {
  await requireUser();

  const [data, funnelDetails] = await Promise.all([loadDashboardData(), loadFunnelDetails()]);
  const errors = funnelDetails.error ? [...data.errors, funnelDetails.error] : data.errors;

  const funnel = data.funnel;

  return (
    <div className={styles.dashboardShell}>
      {/* Page Header & Quick Actions Toolbar */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.pageBadge}>
            <span className={styles.liveDot} />
            <span>Live Data</span>
          </div>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.sub}>
            Track your leads from import to closed deal.
          </p>
        </div>

        <div className={styles.actionToolbar}>
          <a href="/crm/export/prospects" className={styles.quickActionBtn}>
            <span>Export CSV ↓</span>
          </a>
        </div>
      </div>

      {errors.length > 0 && (
        <div className={crmStyles.errorBanner}>
          <strong>Some sections failed to load:</strong>
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Top 4 Interactive Responsive KPI Cards with Direct Routing */}
      <section className={styles.kpiGrid} aria-label="Key Performance Indicators">
        {/* Card 1: Discovered Leads -> /crm/companies */}
        <Link href="/crm/companies" className={styles.kpiCard} title="View all companies in CRM">
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Discovered Leads</span>
            <div className={styles.kpiIconWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="9" y1="6" x2="9" y2="6.01" />
                <line x1="15" y1="6" x2="15" y2="6.01" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{funnel?.discovered ?? 0}</span>
          </div>
          <div className={styles.kpiFooter}>
            <span>Target companies</span>
            <span className={styles.kpiLinkArrow}>
              View <span aria-hidden="true">→</span>
            </span>
          </div>
        </Link>

        {/* Card 2: Verified Contacts -> /crm/prospects */}
        <Link href="/crm/prospects" className={styles.kpiCard} title="View scored prospects">
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Verified Contacts</span>
            <div className={styles.kpiIconWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{funnel?.verified ?? 0}</span>
          </div>
          <div className={styles.kpiFooter}>
            <span>{funnel?.contactsFound ?? 0} discovered</span>
            <span className={styles.kpiLinkArrow}>
              View <span aria-hidden="true">→</span>
            </span>
          </div>
        </Link>

        {/* Card 3: Active Pipeline -> /crm/pipeline */}
        <Link href="/crm/pipeline" className={styles.kpiCard} title="View deals pipeline board">
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Active Pipeline</span>
            <div className={styles.kpiIconWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="5" height="18" rx="1" />
                <rect x="10.5" y="3" width="5" height="13" rx="1" />
                <rect x="18" y="3" width="5" height="8" rx="1" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{funnel?.opportunities ?? 0}</span>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>deals</span>
          </div>
          <div className={styles.kpiFooter}>
            <span>Across 5 stages</span>
            <span className={styles.kpiLinkArrow}>
              View <span aria-hidden="true">→</span>
            </span>
          </div>
        </Link>

        {/* Card 4: Customers Won -> /crm/pipeline */}
        <Link href="/crm/pipeline" className={styles.kpiCard} title="View won deals in pipeline">
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Customers Won</span>
            <div className={styles.kpiIconWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{funnel?.won ?? 0}</span>
            <span style={{ fontSize: 13, color: "var(--good)", fontWeight: 600 }}>closed</span>
          </div>
          <div className={styles.kpiFooter}>
            <span>Converted leads</span>
            <span className={styles.kpiLinkArrow}>
              View <span aria-hidden="true">→</span>
            </span>
          </div>
        </Link>
      </section>

      {/* Conversion Funnel */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <h2 className={styles.panelTitle}>Lead Funnel</h2>
            <span className={styles.panelMeta}>10 stages</span>
          </div>
          <Link href="/crm/pipeline" className={styles.panelHeaderLink}>
            Open Pipeline →
          </Link>
        </div>
        <FunnelSection funnel={funnel} details={funnelDetails.details} />
      </section>

      {/* Top Scored Prospects */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <h2 className={styles.panelTitle}>Top Prospects</h2>
            <span className={styles.panelMeta}>Website audit</span>
          </div>
          <Link href="/crm/prospects" className={styles.panelHeaderLink}>
            See All Prospects →
          </Link>
        </div>
        <TopProspects prospects={data.prospects} />
      </section>

      {/* Two-Column Bottom Grid */}
      <div className={styles.twoColGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <h2 className={styles.panelTitle}>AI Spend</h2>
              <span className={styles.panelMeta}>Cost breakdown</span>
            </div>
          </div>
          <CostsCard costs={data.costs} />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <h2 className={styles.panelTitle}>Scoring Tests</h2>
              <span className={styles.panelMeta}>Accuracy</span>
            </div>
          </div>
          <EvaluationCard evaluation={data.evaluation} />
        </section>
      </div>
    </div>
  );
}
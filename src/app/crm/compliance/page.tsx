import Link from "next/link";
import styles from "@/app/crm/crm.module.css";
import { Flash } from "@/app/crm/flash";
import {
  addSuppressionEntry,
  erasePersonAction,
  markMockContactsAsTestData,
  pruneStaleContactsAction,
  recordLawfulBasis,
  removeSuppressionEntry,
} from "@/app/crm/compliance-actions";
import { requireUser } from "@/lib/auth";
import { loadComplianceOverview } from "@/lib/crm/load-compliance";
import { BASIS_HELP, LAWFUL_BASES, MANUAL_SUPPRESSION_REASONS } from "@/lib/compliance/constants";
import { buildFooter } from "@/lib/compliance/footer";
import { getSenderIdentity, senderSettingStatus } from "@/lib/compliance/sender-identity";
import { loadRetentionReport } from "@/lib/compliance/retention";
import { day, label } from "@/lib/crm/format";

export const metadata = {
  title: "Governance & GDPR Compliance · Lead Intelligence Platform",
  robots: { index: false, follow: false },
};

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireUser();
  const { ok, error } = await searchParams;

  const [overview, retention] = await Promise.all([loadComplianceOverview(), loadRetentionReport()]);
  const settings = senderSettingStatus();
  const sender = getSenderIdentity();
  const hasMockContacts = overview.needingBasis.some((c) => c.source === "mock_contact_source");
  const recordedBasisTotal = overview.basisCounts.reduce((sum, b) => sum + b.count, 0);

  return (
    <>
      <div className={styles.pageHeaderRow}>
        <div className={styles.pageHeaderText}>
          <div className={styles.pageKicker}>
            <span className={styles.liveDot} />
            <span>GDPR &amp; Data Safety</span>
          </div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>
            Privacy &amp; GDPR
          </h1>
          <p className={styles.muted} style={{ margin: "4px 0 0" }}>
            Export a contact&apos;s data, erase records safely, and manage opt-out lists.
          </p>
        </div>

        <div className={styles.pageActions}>
          <Link href="/privacy" className={`${styles.buttonSecondary} ${styles.buttonSmall}`}>
            Public Privacy Page ↗
          </Link>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      <section className={styles.statGrid} aria-label="Compliance posture summary">
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Recorded Lawful Basis</span>
          <span className={styles.statValue}>{recordedBasisTotal}</span>
          <span className={styles.statHint}>{overview.needingBasisTotal} contacts pending basis</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active Suppressions</span>
          <span className={styles.statValue}>{overview.suppressions.length}</span>
          <span className={styles.statHint}>SHA-256 hashes &amp; blocked domains</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Retention Policy</span>
          <span className={styles.statValue}>{retention.retentionWindowDays}d</span>
          <span className={styles.statHint}>Automated serverless pruning window</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Pending Pruning</span>
          <span className={styles.statValue}>{retention.totalEligible}</span>
          <span className={styles.statHint}>{retention.totalEligible === 0 ? "All records within window" : "Eligible for cleanup"}</span>
        </div>
      </section>

      {/* ---------- Data Subject Rights (GDPR Art. 15 / 17) ---------- */}
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.panelTitle} style={{ margin: 0 }}>
            Export or Delete a Contact&apos;s Data
          </h2>
          <span className={styles.sectionMeta}>GDPR Art. 15 &amp; 17</span>
        </div>
        <p className={styles.muted} style={{ fontSize: 13, marginBottom: 14 }}>
          Try downloading a live JSON export for <span className={styles.codePill}>sarah.chen@apexcloud.io</span> below.
        </p>

        <div className={styles.twoColSplit}>
          <div style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg)", minWidth: 0 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 14.5, fontWeight: 700 }}>1. Download Contact Data (Art. 15)</h3>
            <p className={styles.muted} style={{ fontSize: 12.5, margin: "0 0 12px" }}>
              Downloads everything saved for this person as a clean JSON file.
            </p>
            <form action="/crm/export/person" method="get" className={styles.formRow}>
              <input
                name="q"
                type="text"
                required
                defaultValue="sarah.chen@apexcloud.io"
                placeholder="Email address or Contact ID"
                className={styles.input}
                style={{ flex: 1 }}
              />
              <button type="submit" className={`${styles.buttonPrimary} ${styles.buttonSmall}`}>
                Download JSON ↓
              </button>
            </form>
          </div>

          <div style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 14.5, fontWeight: 700, color: "var(--bad)" }}>
              2. Erase &amp; Block Permanently (Art. 17)
            </h3>
            <p className={styles.muted} style={{ fontSize: 12.5, margin: "0 0 12px" }}>
              Wipes personal details and stores only a one-way SHA-256 hash so they are never emailed again.
            </p>
            <form action={erasePersonAction} className={styles.formRow} style={{ flexWrap: "wrap" }}>
              <input
                name="query"
                type="text"
                required
                placeholder="Email address or Contact UUID"
                className={styles.input}
                style={{ flex: "1 1 180px" }}
              />
              <input
                name="confirm"
                type="text"
                required
                placeholder="Type ERASE"
                className={styles.input}
                style={{ width: 130 }}
              />
              <button type="submit" className={`${styles.buttonDanger} ${styles.buttonSmall}`}>
                Erase &amp; Suppress
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ---------- Suppression list ---------- */}
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.panelTitle} style={{ margin: 0 }}>
            Cryptographic Suppression List ({overview.suppressions.length})
          </h2>
          <span className={styles.sectionMeta}>SHA-256 One-Way Hashing</span>
        </div>
        <p className={styles.muted} style={{ fontSize: 13, marginBottom: 14 }}>
          Suppressed emails are stored exclusively as SHA-256 digests so erased individuals remain permanently uncontactable without retaining their personal email address.
        </p>

        <form action={addSuppressionEntry} className={styles.formRow} style={{ marginBottom: 14 }}>
          <select name="kind" defaultValue="email" className={styles.select} style={{ width: "auto" }}>
            <option value="email">Email address (hashed)</option>
            <option value="domain">Whole domain</option>
          </select>
          <input
            name="value"
            required
            maxLength={254}
            placeholder="name@example.com or domain.com"
            className={styles.input}
            style={{ flex: "1 1 200px", minWidth: 0, maxWidth: 280 }}
          />
          <select name="reason" defaultValue="manual" className={styles.select} style={{ width: "auto" }}>
            {MANUAL_SUPPRESSION_REASONS.map((r) => (
              <option key={r} value={r}>
                {label(r)}
              </option>
            ))}
          </select>
          <button type="submit" className={`${styles.buttonSecondary} ${styles.buttonSmall}`}>
            Add Entry
          </button>
        </form>

        {overview.suppressions.length === 0 ? (
          <div className={styles.emptyState}>No active suppression entries.</div>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Suppressed Target</th>
                  <th>Reason</th>
                  <th>Source</th>
                  <th>Recorded</th>
                  <th>Audit Override</th>
                </tr>
              </thead>
              <tbody>
                {overview.suppressions.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12.5 }}>{s.target}</td>
                    <td>
                      <span className={styles.chip}>{label(s.reason)}</span>
                    </td>
                    <td className={styles.muted}>{label(s.source)}</td>
                    <td className={styles.muted}>{day(s.createdAt)}</td>
                    <td>
                      <form action={removeSuppressionEntry} className={styles.formRow} style={{ marginTop: 0 }}>
                        <input type="hidden" name="id" value={s.id} />
                        <input
                          name="reason"
                          required
                          minLength={5}
                          maxLength={300}
                          placeholder="Reason to remove..."
                          className={styles.input}
                          style={{ width: 170 }}
                        />
                        <button type="submit" className={`${styles.buttonDanger} ${styles.buttonSmall}`}>
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- Lawful basis & Sender identity ---------- */}
      <div className={styles.twoColSplit}>
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2 className={styles.panelTitle} style={{ margin: 0 }}>
              Lawful Basis Registry
            </h2>
            <span className={styles.sectionMeta}>{overview.needingBasisTotal} Unassigned</span>
          </div>
          <p className={styles.muted} style={{ fontSize: 13, marginBottom: 12 }}>
            Contacts require a documented legal basis and provenance record before outreach drafting is permitted.
          </p>

          <div className={styles.chipList} style={{ marginBottom: 14 }}>
            {overview.basisCounts.map((c) => (
              <span key={c.basis} className={styles.badge}>
                {label(c.basis)}: {c.count}
              </span>
            ))}
          </div>

          <details style={{ marginBottom: 12 }}>
            <summary className={styles.clickable} style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Basis definitions (GDPR Art. 6)
            </summary>
            <ul className={styles.list} style={{ marginTop: 8, fontSize: 12.5 }}>
              {LAWFUL_BASES.map((b) => (
                <li key={b} className={styles.listItem}>
                  <strong>{label(b)}:</strong> {BASIS_HELP[b]}
                </li>
              ))}
            </ul>
          </details>

          {hasMockContacts && (
            <form action={markMockContactsAsTestData} className={styles.formRow} style={{ marginBottom: 12 }}>
              <button type="submit" className={`${styles.buttonSecondary} ${styles.buttonSmall}`}>
                Mark mock-source contacts as test data
              </button>
            </form>
          )}

          {overview.needingBasis.length === 0 ? (
            <div className={styles.emptyState}>All active contacts have a documented lawful basis.</div>
          ) : (
            <ul className={styles.list}>
              {overview.needingBasis.slice(0, 8).map((c) => (
                <li key={c.id} className={styles.listItem}>
                  <div style={{ fontSize: 13 }}>
                    <strong>{c.name}</strong>
                    {c.title ? ` · ${c.title}` : ""} at <Link href={`/crm/companies/${c.companyId}`}>{c.companyName}</Link>
                  </div>
                  <form action={recordLawfulBasis}>
                    <input type="hidden" name="contactId" value={c.id} />
                    <div className={styles.formGrid}>
                      <label className={styles.label}>
                        Basis
                        <select name="basis" defaultValue="" required className={styles.select}>
                          <option value="" disabled>
                            Choose basis
                          </option>
                          {LAWFUL_BASES.map((b) => (
                            <option key={b} value={b}>
                              {label(b)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.label}>
                        Assessment note
                        <input name="note" maxLength={500} className={styles.input} />
                      </label>
                      <label className={styles.label}>
                        Source provenance
                        <input name="collectedFrom" maxLength={300} placeholder="Corporate website / directory" className={styles.input} />
                      </label>
                    </div>
                    <button type="submit" className={`${styles.buttonPrimary} ${styles.buttonSmall}`} style={{ marginTop: 8 }}>
                      Record Basis
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2 className={styles.panelTitle} style={{ margin: 0 }}>
              Sender Identity &amp; Headers
            </h2>
            <span className={`${styles.badge} ${sender.ok ? styles.badgeGood : styles.badgeWarn}`}>
              {sender.ok ? "Configured" : "Incomplete"}
            </span>
          </div>
          <p className={styles.muted} style={{ fontSize: 13, marginBottom: 12 }}>
            Dispatch is blocked unless verifiable sender identity, postal address, and signed HMAC one-click unsubscribe headers are configured.
          </p>
          <ul className={styles.list}>
            {settings.map((s) => (
              <li key={s.name} className={styles.listItem} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13 }}>{s.name}</span>
                <span className={`${styles.badge} ${s.ok ? styles.badgeGood : styles.badgeBad}`}>
                  {s.ok ? "verified" : s.problem ?? "missing"}
                </span>
              </li>
            ))}
          </ul>

          {sender.ok && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div className={styles.muted} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Compliance Footer Preview
              </div>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 12 }} className={styles.muted}>
                {buildFooter(
                  sender.identity,
                  `${sender.identity.baseUrl.replace(/\/+$/, "")}/unsubscribe/<hmac-signed-token>`,
                  "public corporate directory"
                )}
              </pre>
            </div>
          )}
        </section>
      </div>

      {/* ---------- Retention Policy & Do-Not-Contact ---------- */}
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.panelTitle} style={{ margin: 0 }}>
              Automated {retention.retentionWindowDays}-Day Data Retention
            </h2>
          </div>
          <form action={pruneStaleContactsAction}>
            <button
              type="submit"
              disabled={retention.totalEligible === 0}
              className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
            >
              Run Retention Pruning ({retention.totalEligible} eligible)
            </button>
          </form>
        </div>

        <div className={styles.chipList} style={{ marginBottom: 14 }}>
          <span className={styles.badge}>Window: {retention.retentionWindowDays} days</span>
          <span className={styles.badge}>Stale uncontacted: {retention.staleUncontactedCount}</span>
          <span className={styles.badge}>Suppressed to anonymize: {retention.unsubscribedRetentionCount}</span>
          <span className={`${styles.badge} ${retention.totalEligible > 0 ? styles.badgeBad : styles.badgeGood}`}>
            Pending pruning: {retention.totalEligible}
          </span>
        </div>

        {retention.candidates.length > 0 ? (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Age</th>
                  <th>Policy Trigger</th>
                </tr>
              </thead>
              <tbody>
                {retention.candidates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div>{c.name}</div>
                      <div className={styles.muted} style={{ fontSize: 12 }}>
                        {c.email || "No email"}
                      </div>
                    </td>
                    <td>{c.companyName || "—"}</td>
                    <td>{c.ageDays} days</td>
                    <td>
                      <span className={styles.chip}>
                        {c.reason === "stale_uncontacted" ? "Never Contacted" : "Unsubscribed Retention"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            No contacts exceed the {retention.retentionWindowDays}-day retention window. Automated serverless cron enforcement is active.
          </div>
        )}
      </section>

      {overview.flagged.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2 className={styles.panelTitle} style={{ margin: 0 }}>
              Flagged Do Not Contact ({overview.flagged.length})
            </h2>
            <span className={styles.sectionMeta}>Global Address Block</span>
          </div>
          <ul className={styles.list}>
            {overview.flagged.map((c) => (
              <li key={c.id} className={styles.listItem}>
                <Link href={`/crm/companies/${c.companyId}#contact-${c.id}`}>{c.name}</Link> at {c.companyName}
                <div className={styles.muted} style={{ fontSize: 12.5 }}>
                  {c.reason ?? "No reason recorded"}
                  {c.at ? ` · ${day(c.at)}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

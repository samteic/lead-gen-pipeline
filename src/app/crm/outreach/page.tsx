import Link from "next/link";
import styles from "@/app/crm/crm.module.css";
import { Flash } from "@/app/crm/flash";
import { SubmitButton } from "@/app/crm/submit-button";
import { generateDraft } from "@/app/crm/outreach-actions";
import { requireUser } from "@/lib/auth";
import { loadOutreachQueue, type QueueRow } from "@/lib/crm/load-outreach";
import { day, label } from "@/lib/crm/format";

export const metadata = {
  title: "Outreach Review Studio · Lead Intelligence Platform",
  robots: { index: false, follow: false },
};

function statusClass(status: string): string {
  if (["SENT", "DELIVERED", "REPLIED", "QUALIFIED", "MEETING_BOOKED", "CONVERTED"].includes(status)) return styles.badgeGood;
  if (["BOUNCED", "UNSUBSCRIBED", "REJECTED"].includes(status)) return styles.badgeBad;
  if (status === "APPROVED") return styles.badgeAccent;
  return styles.badgeWarn;
}

function EmailTable({ rows, empty }: { rows: QueueRow[]; empty: string }) {
  if (rows.length === 0) return <div className={styles.emptyState}>{empty}</div>;

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Company</th>
            <th>Contact</th>
            <th>State</th>
            <th>Quality Gate</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link href={`/crm/outreach/${r.id}`}>{r.subject}</Link>
              </td>
              <td>
                <Link href={`/crm/companies/${r.companyId}`}>{r.companyName}</Link>
              </td>
              <td>
                {r.contactName}{" "}
                {r.doNotContact && <span className={`${styles.badge} ${styles.badgeBad}`}>do not contact</span>}
              </td>
              <td>
                <span className={`${styles.badge} ${statusClass(r.status)}`}>{label(r.status.toLowerCase())}</span>
              </td>
              <td>
                {r.qualityPassed ? (
                  <span className={`${styles.badge} ${styles.badgeGood}`}>passed</span>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeBad}`}>flagged</span>
                )}
              </td>
              <td className={styles.muted}>{day(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireUser();
  const { ok, error } = await searchParams;
  const queue = await loadOutreachQueue();
  const flaggedCount = queue.drafts.filter((d) => !d.qualityPassed).length;

  return (
    <>
      <div className={styles.pageHeaderRow}>
        <div className={styles.pageHeaderText}>
          <div className={styles.pageKicker}>
            <span className={styles.liveDot} />
            <span>Human Review Required</span>
          </div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>
            Outreach Drafts
          </h1>
          <p className={styles.muted} style={{ margin: "4px 0 0" }}>
            Every AI draft is fact-checked and reviewed by a person before anything can be sent.
          </p>
        </div>

        <div className={styles.pageActions}>
          <Link href="/crm/compliance" className={`${styles.buttonSecondary} ${styles.buttonSmall}`}>
            Privacy Settings →
          </Link>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      <section className={styles.statGrid} aria-label="Outreach queue summary">
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Pending Human Review</span>
          <span className={styles.statValue}>{queue.drafts.length}</span>
          <span className={styles.statHint}>{flaggedCount > 0 ? `${flaggedCount} flagged by quality gate` : "Click any draft to inspect claims"}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Approved &amp; Ready</span>
          <span className={styles.statValue}>{queue.approved.length}</span>
          <span className={styles.statHint}>Passed compliance &amp; quality gate</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Dispatched / Replied</span>
          <span className={styles.statValue}>{queue.history.length}</span>
          <span className={styles.statHint}>Tracked via Svix HMAC webhooks</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Qualified &amp; Ready</span>
          <span className={styles.statValue}>{queue.readyToDraft.length}</span>
          <span className={styles.statHint}>Verified contacts awaiting draft</span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.panelTitle} style={{ margin: 0 }}>
            Needs Review ({queue.drafts.length})
          </h2>
          <span className={styles.sectionMeta}>Inspect Claims &amp; Quality Gate</span>
        </div>
        <EmailTable rows={queue.drafts} empty="No drafts waiting for human review." />
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.panelTitle} style={{ margin: 0 }}>
            Approved, Ready for Dispatch ({queue.approved.length})
          </h2>
          <span className={styles.sectionMeta}>Sandbox Sink Protected</span>
        </div>
        <EmailTable rows={queue.approved} empty="No approved drafts waiting for dispatch." />
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.panelTitle} style={{ margin: 0 }}>
            Ready to Draft ({queue.readyToDraft.length})
          </h2>
          <span className={styles.sectionMeta}>Grounded Signal Context</span>
        </div>
        <p className={styles.muted} style={{ fontSize: 13, marginBottom: 14 }}>
          Open opportunities at New or Qualified whose contact has a verified address, recorded lawful basis, and no active suppression flag.
        </p>
        {queue.readyToDraft.length === 0 ? (
          <div className={styles.emptyState}>
            All currently eligible contacts have active drafts or outreach history.
          </div>
        ) : (
          <ul className={styles.list}>
            {queue.readyToDraft.map((d) => (
              <li key={d.dealId} className={styles.listItem} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div>
                    <Link href={`/crm/opportunities/${d.dealId}`} style={{ fontWeight: 600 }}>
                      {d.dealName}
                    </Link>{" "}
                    <span className={styles.badge}>{label(d.stage)}</span>
                  </div>
                  <div className={styles.muted} style={{ fontSize: 12.5, marginTop: 2 }}>
                    <Link href={`/crm/companies/${d.companyId}`}>{d.companyName}</Link> · {d.contactName}
                    {d.contactTitle ? ` (${d.contactTitle})` : ""}
                  </div>
                </div>
                <form action={generateDraft}>
                  <input type="hidden" name="opportunityId" value={d.dealId} />
                  <input type="hidden" name="returnTo" value="/crm/outreach" />
                  <SubmitButton
                    label="Generate Grounded Draft"
                    pendingLabel="Generating draft..."
                    className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                  />
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.panelTitle} style={{ margin: 0 }}>
            Message History ({queue.history.length})
          </h2>
          <span className={styles.sectionMeta}>Audit Log</span>
        </div>
        <EmailTable rows={queue.history} empty="No dispatched or rejected messages yet." />
      </section>
    </>
  );
}

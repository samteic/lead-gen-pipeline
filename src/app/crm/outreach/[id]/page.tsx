import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import styles from "@/app/crm/crm.module.css";
import { Flash } from "@/app/crm/flash";
import { approveDraft, rejectDraft, saveDraftEdits, sendApproved } from "@/app/crm/outreach-actions";
import { requireUser } from "@/lib/auth";
import { loadDraftDetail } from "@/lib/crm/load-outreach";
import { day, label } from "@/lib/crm/format";
import { CopyPitchButton } from "./copy-pitch-button";
import { SubmitButton } from "@/app/crm/submit-button";

export const metadata = {
  title: "Draft Review & Claim Provenance · Lead Intelligence Platform",
  robots: { index: false, follow: false },
};

function statusClass(status: string): string {
  if (["SENT", "DELIVERED", "REPLIED", "QUALIFIED", "MEETING_BOOKED", "CONVERTED"].includes(status)) return styles.badgeGood;
  if (["BOUNCED", "UNSUBSCRIBED", "REJECTED"].includes(status)) return styles.badgeBad;
  if (status === "APPROVED") return styles.badgeAccent;
  return styles.badgeWarn;
}

export default async function EmailReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { ok, error } = await searchParams;

  if (!z.uuid().safeParse(id).success) notFound();

  const draft = await loadDraftDetail(id);
  if (!draft) notFound();

  const returnTo = `/crm/outreach/${draft.id}`;
  const isDraft = draft.status === "DRAFT";
  const isApproved = draft.status === "APPROVED";
  const blocked = draft.contact.doNotContact;
  const isRealSending = process.env.ENABLE_REAL_EMAIL_SENDING === "true";

  return (
    <>
      <Link href="/crm/outreach" className={styles.backLink}>
        ← Back to Outreach Drafts
      </Link>

      <Flash ok={ok} error={error} />

      <div className={isRealSending ? styles.okBanner : styles.notice} style={{ marginBottom: 16 }}>
        {isRealSending ? (
          <>
            <strong>Live sending is on:</strong> Approved emails go to{" "}
            <strong>{draft.contact.email ?? draft.contact.name}</strong> with a 1-click unsubscribe link.
          </>
        ) : (
          <>
            <strong>Safe test mode:</strong> Nothing is emailed to real people—test sends go to{" "}
            <span className={styles.codePill}>delivered@resend.dev</span>.
          </>
        )}
      </div>

      {/* Header */}
      <section className={styles.panel}>
        <div className={styles.pageKicker} style={{ marginBottom: 6 }}>
          <span>Draft Review</span>
        </div>
        <h1 className={styles.pageTitle} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>{draft.subject}</span>
          <span className={`${styles.badge} ${statusClass(draft.status)}`}>{label(draft.status.toLowerCase())}</span>
          {draft.qualityPassed ? (
            <span className={`${styles.badge} ${styles.badgeGood}`}>Quality Gate Passed</span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeBad}`}>Quality Gate Flagged</span>
          )}
        </h1>

        <div className={styles.metaStrip}>
          <span>
            Recipient: <strong style={{ color: "var(--text)" }}>{draft.contact.name}</strong>
            {draft.contact.title ? ` (${draft.contact.title})` : ""}
          </span>
          <span className={styles.metaSep}>·</span>
          <span>
            Company: <Link href={`/crm/companies/${draft.company.id}`}>{draft.company.name}</Link>
          </span>
          <span className={styles.metaSep}>·</span>
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12 }}>
            {draft.contact.email ?? "no email"} ({draft.contact.emailStatus ?? "unknown"})
          </span>
          {blocked && <span className={`${styles.badge} ${styles.badgeBad}`}>do not contact</span>}
        </div>

        <div className={styles.metaStrip}>
          {draft.deal && (
            <>
              <span>
                Opportunity: <Link href={`/crm/opportunities/${draft.deal.id}`}>{draft.deal.name}</Link> ({label(draft.deal.stage)})
              </span>
              <span className={styles.metaSep}>·</span>
            </>
          )}
          <span>Created {day(draft.createdAt)}</span>
          {draft.reviewedAt && (
            <>
              <span className={styles.metaSep}>·</span>
              <span>
                Reviewed {day(draft.reviewedAt)}
                {draft.reviewedByName ? ` by ${draft.reviewedByName}` : ""}
              </span>
            </>
          )}
          {draft.sentAt && (
            <>
              <span className={styles.metaSep}>·</span>
              <span>Dispatched {day(draft.sentAt)}</span>
            </>
          )}
        </div>

        {blocked && draft.contact.doNotContactReason && (
          <div className={styles.muted} style={{ marginTop: 6, fontSize: 12.5 }}>
            Suppression note: {draft.contact.doNotContactReason}
          </div>
        )}
        {draft.rejectReason && (
          <div className={styles.muted} style={{ marginTop: 6, fontSize: 12.5 }}>
            Rejection reason: {draft.rejectReason}
          </div>
        )}
      </section>

      <div className={styles.detailGrid}>
        <div>
          {/* Message body */}
          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                Draft Content
              </h2>
              <span className={styles.sectionMeta}>{isDraft ? "Editable Draft" : "Locked Record"}</span>
            </div>

            {draft.editedAt && (
              <div className={styles.notice} style={{ fontSize: 12.5 }}>
                Edited by {draft.editedByName ?? "an operator"} on {day(draft.editedAt)}. Original claim citations below reflect the initial generated draft; verify any manually introduced facts before approval.
              </div>
            )}

            {isDraft ? (
              <form action={saveDraftEdits}>
                <input type="hidden" name="messageId" value={draft.id} />
                <input type="hidden" name="returnTo" value={returnTo} />

                <label className={styles.label}>
                  Subject line
                  <input name="subject" required maxLength={120} defaultValue={draft.subject} className={styles.input} />
                </label>
                <label className={styles.label}>
                  Message body
                  <textarea
                    name="body"
                    required
                    maxLength={1500}
                    defaultValue={draft.body}
                    className={styles.textarea}
                    style={{ minHeight: 220, lineHeight: 1.55 }}
                  />
                </label>

                <SubmitButton
                  label="Save edits & re-run quality gate"
                  pendingLabel="Validating edits..."
                  className={styles.buttonSecondary}
                  style={{ marginTop: 12 }}
                />
              </form>
            ) : (
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14 }}>{draft.body}</div>
            )}

            <CopyPitchButton subject={draft.subject} body={draft.body} recipientEmail={draft.contact.email} />
          </section>

          {/* Governance Actions */}
          {(isDraft || isApproved) && (
            <section className={styles.panel}>
              <div className={styles.sectionHead}>
                <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                  {isDraft ? "Approval Gate" : "Sandbox Dispatch"}
                </h2>
                <span className={styles.sectionMeta}>State Machine Guarded</span>
              </div>

              {blocked && (
                <div className={styles.errorBanner} style={{ fontSize: 13 }}>
                  <strong>Blocked by compliance:</strong> This contact is flagged Do Not Contact and cannot be approved or dispatched.
                </div>
              )}

              {isDraft && !blocked && (
                <form action={approveDraft} style={{ marginBottom: 14 }}>
                  <input type="hidden" name="messageId" value={draft.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  {!draft.qualityPassed && (
                    <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 13 }}>
                      <input type="checkbox" name="override" /> Acknowledge flagged quality issues and override gate
                    </label>
                  )}
                  <SubmitButton label="Approve for Dispatch" pendingLabel="Re-validating..." className={styles.buttonPrimary} />
                </form>
              )}

              {isApproved && !blocked && (
                <form action={sendApproved} style={{ marginBottom: 14 }}>
                  <input type="hidden" name="messageId" value={draft.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <SubmitButton
                    label={isRealSending ? `Send to ${draft.contact.email || draft.contact.name}` : "Dispatch to Sandbox Sink"}
                    pendingLabel="Dispatching..."
                    className={styles.buttonPrimary}
                  />
                </form>
              )}

              <form action={rejectDraft} className={styles.formRow}>
                <input type="hidden" name="messageId" value={draft.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input
                  name="reason"
                  required
                  maxLength={300}
                  placeholder="Rejection reason for audit log..."
                  className={styles.input}
                  style={{ flex: "1 1 180px", minWidth: 0 }}
                />
                <SubmitButton label="Reject Draft" pendingLabel="Rejecting..." className={`${styles.buttonDanger} ${styles.buttonSmall}`} />
              </form>
            </section>
          )}
        </div>

        <div>
          {/* Quality Gate Panel */}
          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                Quality Check
              </h2>
              <span className={`${styles.badge} ${draft.qualityPassed ? styles.badgeGood : styles.badgeBad}`}>
                {draft.qualityPassed ? "passed" : `${draft.qualityIssues.length} issue${draft.qualityIssues.length === 1 ? "" : "s"}`}
              </span>
            </div>

            {draft.qualityPassed ? (
              <p className={styles.muted} style={{ fontSize: 13, margin: 0 }}>
                All facts match saved company data and the contact is cleared to receive email.
              </p>
            ) : (
              <ul className={styles.list}>
                {draft.qualityIssues.map((issue) => (
                  <li key={issue} className={styles.listItem} style={{ fontSize: 13, color: "var(--bad)" }}>
                    {issue}
                  </li>
                ))}
              </ul>
            )}

            <p className={styles.muted} style={{ fontSize: 12, marginTop: 12 }}>
              Re-checked automatically whenever you approve.
            </p>
          </section>

          {/* Claim Provenance Panel */}
          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                Where Facts Came From
              </h2>
              <span className={styles.sectionMeta}>{draft.claims.length} verified</span>
            </div>

            {draft.claims.length === 0 ? (
              <p className={styles.muted} style={{ fontSize: 13, margin: 0 }}>
                No company-specific claims were made beyond normalized identity fields (name, industry, contact role).
              </p>
            ) : (
              <div>
                {draft.claims.map((c, i) => (
                  <div key={i} className={styles.claimCard}>
                    <div style={{ fontSize: 13, lineHeight: 1.45 }}>{c.text}</div>
                    <div className={styles.claimSource}>
                      <span>verified source:</span>
                      <span className={styles.codePill} style={{ fontSize: 11 }}>
                        {label(c.source)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {draft.personalizationUsed.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className={styles.muted} style={{ fontSize: 11.5, marginBottom: 6 }}>
                  Signals referenced
                </div>
                <div className={styles.chipList}>
                  {draft.personalizationUsed.map((sig) => (
                    <span key={sig} className={styles.chip}>
                      {label(sig)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Audit Timeline */}
          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                Event History
              </h2>
              <span className={styles.sectionMeta}>{draft.events.length} Events</span>
            </div>

            {draft.events.length === 0 ? (
              <p className={styles.muted} style={{ fontSize: 13, margin: 0 }}>
                No state transitions logged yet.
              </p>
            ) : (
              <ol className={styles.timelineList} style={{ fontSize: 13 }}>
                {draft.events.map((e) => (
                  <li key={e.id} style={{ marginBottom: 6 }}>
                    <strong style={{ color: "var(--text)" }}>{label(e.type)}</strong> · {day(e.at)}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

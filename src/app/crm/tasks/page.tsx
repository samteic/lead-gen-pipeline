import Link from "next/link";
import styles from "@/app/crm/crm.module.css";
import { Flash } from "@/app/crm/flash";
import { setTaskStatus } from "@/app/crm/actions";
import { requireUser } from "@/lib/auth";
import { loadTasks, type TaskScope, type TaskView } from "@/lib/crm/load-tasks";
import { day, label } from "@/lib/crm/format";

export const metadata = {
  title: "Workflow Tasks · Lead Intelligence Platform",
  robots: { index: false, follow: false },
};

function priorityClass(priority: string): string {
  if (priority === "high") return styles.badgeBad;
  if (priority === "low") return "";
  return styles.badgeWarn;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; view?: string; ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { scope: rawScope, view: rawView, ok, error } = await searchParams;

  // In Portfolio Sandbox Mode default to "all" so reviewers immediately see seeded workflow tasks.
  const scope: TaskScope = rawScope === "all" ? "all" : rawScope === "mine" ? "mine" : user.isDemo ? "all" : "mine";
  const view: TaskView = rawView === "closed" ? "closed" : "open";

  const rows = await loadTasks(scope, view, user.id);
  const returnTo = `/crm/tasks?scope=${scope}&view=${view}`;
  const overdueCount = rows.filter((r) => r.overdue).length;
  const highPriorityCount = rows.filter((r) => r.priority === "high").length;

  const link = (nextScope: TaskScope, nextView: TaskView) => `/crm/tasks?scope=${nextScope}&view=${nextView}`;

  return (
    <>
      <div className={styles.pageHeaderRow}>
        <div className={styles.pageHeaderText}>
          <div className={styles.pageKicker}>
            <span className={styles.liveDot} />
            <span>Follow-Ups</span>
          </div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>
            Tasks
          </h1>
          <p className={styles.muted} style={{ margin: "4px 0 0" }}>
            Calls, reviews, and follow-ups to keep active deals moving.
          </p>
        </div>

        <div className={styles.pageActions}>
          <a href="/crm/export/tasks" className={`${styles.buttonSecondary} ${styles.buttonSmall}`}>
            Export CSV ↓
          </a>
          <Link href="/crm/pipeline" className={`${styles.buttonPrimary} ${styles.buttonSmall}`}>
            Open Pipeline →
          </Link>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      <section className={styles.statGrid} aria-label="Task metrics">
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{view === "open" ? "Open Tasks" : "Closed Tasks"}</span>
          <span className={styles.statValue}>{rows.length}</span>
          <span className={styles.statHint}>{scope === "all" ? "Across entire workspace" : "Assigned to you"}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>High Priority</span>
          <span className={styles.statValue}>{highPriorityCount}</span>
          <span className={styles.statHint}>Meetings &amp; urgent escalations</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Overdue</span>
          <span className={styles.statValue}>{overdueCount}</span>
          <span className={styles.statHint}>Past scheduled SLA window</span>
        </div>
      </section>

      <div className={styles.formRow} style={{ marginBottom: 16 }}>
        <Link
          href={link("all", view)}
          className={`${styles.badge} ${scope === "all" ? styles.badgeAccent : ""}`}
          style={{ textDecoration: "none", padding: "4px 12px" }}
        >
          All workspace
        </Link>
        {!user.isDemo && (
          <Link
            href={link("mine", view)}
            className={`${styles.badge} ${scope === "mine" ? styles.badgeAccent : ""}`}
            style={{ textDecoration: "none", padding: "4px 12px" }}
          >
            Mine
          </Link>
        )}
        <span className={styles.metaSep}>·</span>
        <Link
          href={link(scope, "open")}
          className={`${styles.badge} ${view === "open" ? styles.badgeAccent : ""}`}
          style={{ textDecoration: "none", padding: "4px 12px" }}
        >
          Open
        </Link>
        <Link
          href={link(scope, "closed")}
          className={`${styles.badge} ${view === "closed" ? styles.badgeAccent : ""}`}
          style={{ textDecoration: "none", padding: "4px 12px" }}
        >
          Completed / Cancelled
        </Link>
      </div>

      <section className={styles.panel}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>No tasks match the selected filter.</div>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Opportunity</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const isOpen = t.status === "pending" || t.status === "in_progress";
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.title}</td>
                      <td>
                        {t.opportunityId ? (
                          <Link href={`/crm/opportunities/${t.opportunityId}`}>{t.opportunityName ?? "Open deal"}</Link>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td>
                        {t.companyId ? (
                          <Link href={`/crm/companies/${t.companyId}`}>{t.companyName ?? "Company"}</Link>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.chip}>{label(t.type)}</span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${priorityClass(t.priority)}`}>{t.priority}</span>
                      </td>
                      <td className={styles.muted}>{t.assigneeName ?? "Unassigned"}</td>
                      <td>
                        {t.dueAt ? day(t.dueAt) : "No date"}{" "}
                        {t.overdue && <span className={`${styles.badge} ${styles.badgeBad}`}>overdue</span>}
                      </td>
                      <td>
                        <form action={setTaskStatus} className={styles.formRow} style={{ marginTop: 0 }}>
                          <input type="hidden" name="taskId" value={t.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          {isOpen ? (
                            <>
                              <button
                                type="submit"
                                name="status"
                                value="completed"
                                className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                              >
                                Done
                              </button>
                              <button
                                type="submit"
                                name="status"
                                value="cancelled"
                                className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="submit"
                              name="status"
                              value="pending"
                              className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                            >
                              Reopen
                            </button>
                          )}
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

import Link from "next/link";
import styles from "@/app/crm/crm.module.css";
import { Flash } from "@/app/crm/flash";
import { moveStage } from "@/app/crm/actions";
import { requireUser } from "@/lib/auth";
import { loadBoard, type BoardCard, type OwnerFilter } from "@/lib/crm/load-pipeline";
import { STAGES, isStage, nextStages } from "@/lib/crm/opportunity-state-machine";
import { label, money } from "@/lib/crm/format";

export const metadata = {
  title: "Opportunity Pipeline · Lead Intelligence Platform",
  robots: { index: false, follow: false },
};

function DealCard({ card, returnTo }: { card: BoardCard; returnTo: string }) {
  const options = isStage(card.stage) ? nextStages(card.stage).filter((s) => s !== "won" && s !== "lost") : [];

  return (
    <div className={styles.boardCard}>
      <Link href={`/crm/opportunities/${card.id}`} className={styles.cardTitle}>
        {card.name}
      </Link>
      <div className={styles.cardMeta} style={{ color: "var(--text)", fontWeight: 500 }}>
        {card.companyName}
      </div>
      <div className={styles.cardMeta}>
        {card.contactName ? `${card.contactName}${card.contactTitle ? ` · ${card.contactTitle}` : ""}` : "No contact assigned"}
      </div>
      <div className={styles.cardMeta} style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ color: "var(--text)", fontWeight: 600 }}>{money(card.estimatedValue)}</span>
        <span>{card.ownerName ?? "Unassigned"}</span>
      </div>

      {card.openTasks > 0 && (
        <div className={styles.formRow} style={{ marginTop: 6 }}>
          <span className={styles.badge}>
            {card.openTasks} open task{card.openTasks === 1 ? "" : "s"}
          </span>
          {card.overdueTasks > 0 && <span className={`${styles.badge} ${styles.badgeBad}`}>{card.overdueTasks} overdue</span>}
        </div>
      )}

      {options.length > 0 && (
        <form action={moveStage} className={styles.formRow} style={{ marginTop: 8 }}>
          <input type="hidden" name="opportunityId" value={card.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <select name="toStage" className={styles.select} defaultValue={options[0]} style={{ flex: 1, padding: "4px 8px", fontSize: 12 }}>
            {options.map((stage) => (
              <option key={stage} value={stage}>
                → {label(stage)}
              </option>
            ))}
          </select>
          <button type="submit" className={`${styles.buttonSecondary} ${styles.buttonSmall}`}>
            Move
          </button>
        </form>
      )}
    </div>
  );
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string; ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { owner, ok, error } = await searchParams;

  const filter: OwnerFilter = owner === "mine" || owner === "unassigned" ? owner : "all";
  const cards = await loadBoard(filter, user.id);
  const returnTo = filter === "all" ? "/crm/pipeline" : `/crm/pipeline?owner=${filter}`;

  const openCards = cards.filter((c) => c.stage !== "won" && c.stage !== "lost");
  const wonCards = cards.filter((c) => c.stage === "won");
  const openValue = openCards.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
  const wonValue = wonCards.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
  const overdueCount = openCards.reduce((sum, c) => sum + c.overdueTasks, 0);

  const filters: Array<{ key: OwnerFilter; text: string; href: string }> = user.isDemo
    ? [
        { key: "all", text: "All opportunities", href: "/crm/pipeline" },
        { key: "unassigned", text: "Unassigned", href: "/crm/pipeline?owner=unassigned" },
      ]
    : [
        { key: "all", text: "All opportunities", href: "/crm/pipeline" },
        { key: "mine", text: "Mine", href: "/crm/pipeline?owner=mine" },
        { key: "unassigned", text: "Unassigned", href: "/crm/pipeline?owner=unassigned" },
      ];

  return (
    <>
      <div className={styles.pageHeaderRow}>
        <div className={styles.pageHeaderText}>
          <div className={styles.pageKicker}>
            <span className={styles.liveDot} />
            <span>Sales Board</span>
          </div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>
            Pipeline
          </h1>
          <p className={styles.muted} style={{ margin: "4px 0 0" }}>
            Track every active deal and move it step by step toward closed won.
          </p>
        </div>

        <div className={styles.pageActions}>
          <a href="/crm/export/deals" className={`${styles.buttonSecondary} ${styles.buttonSmall}`}>
            Export CSV ↓
          </a>
          <Link href="/crm/companies" className={`${styles.buttonPrimary} ${styles.buttonSmall}`}>
            View Companies →
          </Link>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      <section className={styles.statGrid} aria-label="Pipeline metrics">
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Open Pipeline Value</span>
          <span className={styles.statValue}>{money(openValue)}</span>
          <span className={styles.statHint}>{openCards.length} active opportunities</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Closed Won</span>
          <span className={styles.statValue}>{money(wonValue)}</span>
          <span className={styles.statHint}>{wonCards.length} converted accounts</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Tracked</span>
          <span className={styles.statValue}>{cards.length}</span>
          <span className={styles.statHint}>Across {STAGES.length} governed stages</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Overdue Follow-Ups</span>
          <span className={styles.statValue}>{overdueCount}</span>
          <span className={styles.statHint}>Linked automated &amp; manual tasks</span>
        </div>
      </section>

      <div className={styles.formRow} style={{ marginBottom: 16 }}>
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.href}
            className={`${styles.badge} ${f.key === filter ? styles.badgeAccent : ""}`}
            style={{ textDecoration: "none", padding: "4px 12px" }}
          >
            {f.text}
          </Link>
        ))}
      </div>

      <div className={styles.boardScroll}>
        <div className={styles.board}>
          {STAGES.map((stage) => {
            const inStage = cards.filter((c) => c.stage === stage);
            const stageSum = inStage.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
            return (
              <div key={stage} className={styles.boardColumn}>
                <h2 className={styles.boardColumnHead}>
                  <span>
                    {label(stage)} <span style={{ opacity: 0.65 }}>({inStage.length})</span>
                  </span>
                  {stageSum > 0 && <span className={styles.stageValue}>{money(stageSum)}</span>}
                </h2>
                {inStage.length === 0 ? (
                  <div className={styles.muted} style={{ fontSize: 12, padding: "8px 2px" }}>
                    No deals in stage
                  </div>
                ) : (
                  inStage.map((card) => <DealCard key={card.id} card={card} returnTo={returnTo} />)
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

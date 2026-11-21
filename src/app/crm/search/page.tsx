import Link from "next/link";
import styles from "@/app/crm/crm.module.css";
import { requireUser } from "@/lib/auth";
import { runSearch } from "@/lib/crm/load-search";
import { label } from "@/lib/crm/format";

export const metadata = {
  title: "Search · Lead Intelligence Platform",
  robots: { index: false, follow: false },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const { q } = await searchParams;

  const term = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const results = await runSearch(term);
  const total = results.companies.length + results.contacts.length + results.deals.length;

  return (
    <>
      <div className={styles.pageHeaderRow}>
        <div className={styles.pageHeaderText}>
          <div className={styles.pageKicker}>
            <span className={styles.liveDot} />
            <span>Quick Find</span>
          </div>
          <h1 className={styles.pageTitle} style={{ margin: 0 }}>
            Search
          </h1>
          <p className={styles.muted} style={{ margin: "4px 0 0" }}>
            Find any company, domain, contact, or deal.
          </p>
        </div>
      </div>

      <section className={styles.panel}>
        <form method="get" className={styles.searchBox} style={{ marginBottom: 0 }}>
          <input
            name="q"
            defaultValue={term}
            placeholder="Try 'Apex', 'Cloud', 'Sarah', or 'veritasec.com'..."
            className={styles.input}
          />
          <button type="submit" className={styles.buttonPrimary}>
            Search
          </button>
        </form>
      </section>

      {term.length < 2 ? (
        <div className={styles.emptyState}>Enter at least 2 characters to search companies, contacts, and opportunities.</div>
      ) : total === 0 ? (
        <div className={styles.emptyState}>No records matched &ldquo;{term}&rdquo;.</div>
      ) : (
        <>
          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                Companies ({results.companies.length})
              </h2>
            </div>
            {results.companies.length === 0 ? (
              <p className={styles.muted}>No matching companies.</p>
            ) : (
              <ul className={styles.list}>
                {results.companies.map((c) => (
                  <li key={c.id} className={styles.listItem}>
                    <Link href={`/crm/companies/${c.id}`} style={{ fontWeight: 600 }}>
                      {c.name}
                    </Link>
                    <div className={styles.muted} style={{ fontSize: 12.5 }}>
                      {[c.domain, c.industry].filter(Boolean).join(" · ")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                Contacts ({results.contacts.length})
              </h2>
            </div>
            {results.contacts.length === 0 ? (
              <p className={styles.muted}>No matching contacts.</p>
            ) : (
              <ul className={styles.list}>
                {results.contacts.map((c) => (
                  <li key={c.id} className={styles.listItem}>
                    <Link href={`/crm/companies/${c.companyId}#contact-${c.id}`} style={{ fontWeight: 600 }}>
                      {c.name}
                    </Link>
                    <div className={styles.muted} style={{ fontSize: 12.5 }}>
                      {c.title ? `${c.title} · ` : ""}
                      {c.companyName}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                Opportunities ({results.deals.length})
              </h2>
            </div>
            {results.deals.length === 0 ? (
              <p className={styles.muted}>No matching opportunities.</p>
            ) : (
              <ul className={styles.list}>
                {results.deals.map((d) => (
                  <li key={d.id} className={styles.listItem}>
                    <Link href={`/crm/opportunities/${d.id}`} style={{ fontWeight: 600 }}>
                      {d.name}
                    </Link>{" "}
                    <span className={styles.badge}>{label(d.stage)}</span>
                    <div className={styles.muted} style={{ fontSize: 12.5 }}>
                      {d.companyName}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}

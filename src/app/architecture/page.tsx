import Link from "next/link";
import styles from "../page.module.css";
import { LandingNavbar } from "../landing-navbar";
import { GITHUB_REPO_URL, githubFileUrl } from "@/lib/demo";
import { evaluateScoring } from "@/lib/evaluation/evaluate-scoring";
import { evaluateContactSelection } from "@/lib/evaluation/evaluate-contact-selection";
import { runRegressionSuite } from "@/lib/evaluation/regression-suite";

export const metadata = {
  title: "How It's Built | Lead Intelligence Platform",
  description: "Architecture, live test results, and key engineering choices behind the Lead Intelligence Platform.",
};

const DECISIONS = [
  {
    tag: "Privacy & GDPR",
    title: "Delete personal data without emailing them again",
    problem: "If you erase someone's email completely, a future spreadsheet upload could add them back.",
    solution: "When a contact is erased, their profile is wiped and only a one-way SHA-256 hash of their email is kept on the block list.",
    file: "src/lib/compliance/gdpr.ts",
  },
  {
    tag: "AI Safety",
    title: "Stop AI from making up facts in drafts",
    problem: "AI models often invent fake funding rounds or company news when drafting sales messages.",
    solution: "Every draft lists where each fact came from. A quality check flags any claim that doesn't match saved company data before human approval.",
    file: "src/lib/outreach/quality-gate.ts",
  },
  {
    tag: "Pipeline Integrity",
    title: "Keep deal stages clean and predictable",
    problem: "Basic CRM updates let deals skip stages or overwrite another teammate's edits.",
    solution: "A strict state machine controls allowed stage moves, and database updates check the current stage first before saving.",
    file: "src/lib/crm/opportunity-state-machine.ts",
  },
  {
    tag: "Reliability",
    title: "Handle slow websites without timing out",
    problem: "Scraping dead or slow websites can crash serverless jobs mid-import.",
    solution: "Jobs track a 50-second time budget, save progress along the way, and wait 7 days before retrying failed sites.",
    file: "src/lib/acquisition.ts",
  },
  {
    tag: "Security",
    title: "Multiple layers of data protection",
    problem: "Checking login only in middleware leaves server actions and database APIs exposed.",
    solution: "Every page and action checks auth, Postgres RLS locks all 16 tables from anonymous access, webhooks verify HMAC signatures, and CSV exports block formula injection.",
    file: "supabase/migrations/20261016_enable_rls.sql",
  },
  {
    tag: "Honest Metrics",
    title: "Show real test results—never fake numbers",
    problem: "Many AI demos hide accuracy or show made-up conversion numbers.",
    solution: "Missing metrics display as n/a, unavailable website signals are never guessed, and benchmark results separate real companies from test profiles.",
    file: "src/lib/evaluation/ground-truth.ts",
  },
];

export default function ArchitecturePage() {
  const scoring = evaluateScoring();
  const contacts = evaluateContactSelection();
  const regression = runRegressionSuite();

  const allEntries = [
    ...scoring.matrix.truePositives,
    ...scoring.matrix.falsePositives,
    ...scoring.matrix.falseNegatives,
    ...scoring.matrix.trueNegatives,
  ];
  const realCount = allEntries.filter((e) => e.isReal).length;
  const testCount = allEntries.length - realCount;
  const pct = (v: number | null) => (v === null ? "n/a" : `${Math.round(v * 100)}%`);

  return (
    <div className={styles.shell}>
      <div className={styles.gridCanvas} aria-hidden="true" />
      <LandingNavbar />

      <main className={styles.content}>
        <section className={styles.archHero}>
          <div className={styles.badgePill}>
            <span className={styles.badgeDot} />
            <span className={styles.badgePillAccent}>System Overview</span>
            <span>·</span>
            <span>Engineering Case Study</span>
          </div>
          <h1 className={styles.archTitle}>How it works under the hood.</h1>
          <p className={styles.archLead}>
            Manual B2B lead research takes hours, while careless automation creates duplicates, wrong AI facts, and privacy risks. This platform handles data cleaning, enrichment, scoring, and compliance in one structured pipeline.
          </p>
          <div className={styles.ctas} style={{ justifyContent: "flex-start" }}>
            <a href="/demo" className={styles.buttonPrimary}>
              Open Live Demo →
            </a>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className={styles.buttonSecondary}>
              View Source on GitHub ↗
            </a>
          </div>
        </section>

        {/* Live Test Benchmarks */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionHeading}>Live test benchmarks</h2>
              <p className={styles.sectionSub}>
                Calculated live from {realCount} real human-reviewed companies and {testCount} test profiles.
              </p>
            </div>
          </div>

          <div className={styles.metricsStrip}>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Scoring Precision</span>
              <span className={styles.metricValue}>{pct(scoring.precision)}</span>
              <span className={styles.metricSub}>
                {scoring.matrix.truePositives.length} true positives · {scoring.matrix.falsePositives.length} false positives
              </span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Scoring Recall</span>
              <span className={styles.metricValue}>{pct(scoring.recall)}</span>
              <span className={styles.metricSub}>
                {scoring.matrix.falseNegatives.length} missed · {scoring.matrix.trueNegatives.length} filtered out
              </span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Contact Ranking</span>
              <span className={styles.metricValue}>{pct(contacts.accuracy)}</span>
              <span className={styles.metricSub}>Across {contacts.results.length} role test cases</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Safety Checks</span>
              <span className={styles.metricValue}>
                {regression.results.length - regression.failedCount}/{regression.results.length}
              </span>
              <span className={styles.metricSub}>Core rules passing</span>
            </div>
          </div>
        </section>

        {/* Automated Checks */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionHeading}>Automated safety checks</h2>
              <p className={styles.sectionSub}>Core rules verified on every run so key behaviors never break.</p>
            </div>
          </div>
          <ul className={styles.invariantList}>
            {regression.results.map((item) => (
              <li key={item.name} className={styles.invariantItem}>
                <span className={styles.statusGood}>{item.passed ? "PASS" : "FAIL"}</span>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Key Engineering Choices */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionHeading}>Key engineering decisions</h2>
              <p className={styles.sectionSub}>Real problems solved during the build, with links to the code.</p>
            </div>
          </div>

          <div className={styles.decisionGrid}>
            {DECISIONS.map((d) => (
              <div key={d.title} className={styles.decisionCard}>
                <span className={styles.bentoTag}>{d.tag}</span>
                <h3>{d.title}</h3>
                <p>
                  <strong style={{ color: "var(--text)" }}>Problem:</strong> {d.problem}
                </p>
                <p>
                  <strong style={{ color: "var(--text)" }}>Solution:</strong> {d.solution}
                </p>
                <a
                  href={githubFileUrl(d.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.bentoCode}
                  style={{ textDecoration: "none" }}
                >
                  <span>{d.file}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <span>Lead Intelligence Platform · System Architecture</span>
          <div className={styles.footerLinks}>
            <Link href="/">Home</Link>
            <a href="/demo">Live Demo</a>
            <Link href="/privacy">Privacy</Link>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

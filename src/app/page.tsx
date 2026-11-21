import Link from "next/link";
import styles from "./page.module.css";
import { LandingNavbar } from "./landing-navbar";
import { PipelineDemo } from "./pipeline-demo";
import { GITHUB_REPO_URL, githubFileUrl } from "@/lib/demo";
import { evaluateScoring } from "@/lib/evaluation/evaluate-scoring";
import { runRegressionSuite } from "@/lib/evaluation/regression-suite";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lead Intelligence | Find, Clean & Qualify B2B Leads",
  description:
    "Turn messy company lists into clean, scored, ready-to-work B2B leads. Live interactive demo with AI scoring, sales pipeline, and GDPR tools.",
};

interface LiveStats {
  companies: number | null;
  qualified: number | null;
  opportunities: number | null;
}

async function loadLiveStats(): Promise<LiveStats> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { companies: null, qualified: null, opportunities: null };
  }
  try {
    const [companiesRes, qualifiedRes, oppsRes] = await Promise.all([
      supabase.from("companies").select("*", { count: "exact", head: true }),
      supabase.from("lead_scores").select("*", { count: "exact", head: true }).in("priority", ["HIGH", "MEDIUM", "LOW"]),
      supabase.from("opportunities").select("*", { count: "exact", head: true }),
    ]);
    return {
      companies: companiesRes.count ?? null,
      qualified: qualifiedRes.count ?? null,
      opportunities: oppsRes.count ?? null,
    };
  } catch {
    return { companies: null, qualified: null, opportunities: null };
  }
}

const FEATURES = [
  {
    tag: "01 / AI SCORING",
    title: "Tested lead scoring",
    desc: "Ranks leads by fit and intent, checked live against real test cases right inside the dashboard.",
    file: "src/lib/evaluation/regression-suite.ts",
  },
  {
    tag: "02 / CLEAN DATA",
    title: "Automatic duplicate blocking",
    desc: "Cleans messy names and domains so the same business is never saved twice.",
    file: "src/lib/dedupe.ts",
  },
  {
    tag: "03 / PIPELINE",
    title: "Safe deal stages",
    desc: "Deals move cleanly step by step with full history—no accidental jumps or lost updates.",
    file: "src/lib/crm/opportunity-state-machine.ts",
  },
  {
    tag: "04 / OUTREACH",
    title: "Fact-checked drafts",
    desc: "Every AI draft shows where each fact came from and waits for human approval before sending.",
    file: "src/lib/outreach/quality-gate.ts",
  },
  {
    tag: "05 / PRIVACY",
    title: "Built-in GDPR tools",
    desc: "Download a person's data in 1 click, erase records safely, and keep opt-outs hashed.",
    file: "src/lib/compliance/gdpr.ts",
  },
  {
    tag: "06 / SECURITY",
    title: "Locked-down database",
    desc: "All 16 Postgres tables enforce Row-Level Security alongside HMAC-verified webhook ingress.",
    file: "supabase/migrations/20261016_enable_rls.sql",
  },
];

export default async function Home() {
  const stats = await loadLiveStats();
  const scoringEval = evaluateScoring();
  const regression = runRegressionSuite();

  const regressionPassed = regression.results.length - regression.failedCount;
  const accuracyPct = Math.round(scoringEval.accuracy * 100);

  return (
    <div className={styles.shell}>
      <div className={styles.gridCanvas} aria-hidden="true" />
      <LandingNavbar />

      <main className={styles.content}>
        {/* Asymmetric Editorial Hero */}
        <section className={styles.heroGrid}>
          <div className={styles.heroLeft}>
            <div className={styles.badgePill}>
              <span className={styles.badgeDot} />
              <span className={styles.badgePillAccent}>Lead Intelligence</span>
              <span>·</span>
              <span>Live Demo</span>
            </div>

            <h1 className={styles.pageTitle}>
              Turn messy lists into <span className={styles.serifAccent}>qualified</span> B2B leads.
            </h1>

            <p className={styles.heroSubtitle}>
              Upload companies, remove duplicates, audit websites, score best-fit accounts with AI, and track deals in one workspace.
            </p>

            <div className={styles.ctas}>
              <a href="/demo" className={styles.buttonPrimary}>
                Try Live Demo →
              </a>
              <Link href="/architecture" className={styles.buttonSecondary}>
                How It&apos;s Built
              </Link>
            </div>

            <div className={styles.heroProof}>
              <span>
                <strong>{stats.companies ?? 10}</strong> sample accounts
              </span>
              <span>
                <strong>{regressionPassed}/{regression.results.length}</strong> safety checks passing
              </span>
              <span>
                <strong>16</strong> RLS tables
              </span>
            </div>
          </div>

          <PipelineDemo />
        </section>

        {/* How It Works — 1px Hairline Strip */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionKicker}>Workflow</span>
              <h2 className={styles.sectionHeading}>How it works</h2>
              <p className={styles.sectionSub}>From raw spreadsheet to ready-to-work deals in four steps.</p>
            </div>
          </div>

          <div className={styles.hairlineGrid4}>
            <div className={styles.hairlineCell}>
              <span className={styles.stepIndex}>01</span>
              <span className={styles.stepTitle}>Import companies</span>
              <span className={styles.stepDesc}>Upload any CSV or pull accounts through the API.</span>
            </div>

            <div className={styles.hairlineCell}>
              <span className={styles.stepIndex}>02</span>
              <span className={styles.stepTitle}>Clean &amp; dedupe</span>
              <span className={styles.stepDesc}>Standardizes domains and stops duplicate records automatically.</span>
            </div>

            <div className={styles.hairlineCell}>
              <span className={styles.stepIndex}>03</span>
              <span className={styles.stepTitle}>Audit &amp; score</span>
              <span className={styles.stepDesc}>Checks websites for gaps and scores fit from 0 to 100.</span>
            </div>

            <div className={styles.hairlineCell}>
              <span className={styles.stepIndex}>04</span>
              <span className={styles.stepTitle}>Track &amp; export</span>
              <span className={styles.stepDesc}>Manage deals on the board or download clean CSV lists.</span>
            </div>
          </div>
        </section>

        {/* Real Verified Numbers */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionKicker}>Verified Data</span>
              <h2 className={styles.sectionHeading}>Real numbers from this build</h2>
              <p className={styles.sectionSub}>Live database counts and automated test outputs—no invented stats.</p>
            </div>
          </div>

          <div className={styles.metricsStrip}>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Companies indexed</span>
              <span className={styles.metricValue}>{stats.companies ?? "—"}</span>
              <span className={styles.metricSub}>
                {stats.qualified !== null ? `${stats.qualified} scored & qualified` : "Live database count"}
              </span>
            </div>

            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Deals tracked</span>
              <span className={styles.metricValue}>{stats.opportunities ?? "—"}</span>
              <span className={styles.metricSub}>Across pipeline stages</span>
            </div>

            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Scoring accuracy</span>
              <span className={styles.metricValue}>{accuracyPct}%</span>
              <span className={styles.metricSub}>
                {regressionPassed}/{regression.results.length} safety checks passing
              </span>
            </div>

            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Database security</span>
              <span className={styles.metricValue}>16 tables</span>
              <span className={styles.metricSub}>Protected with Postgres RLS</span>
            </div>
          </div>
        </section>

        {/* Under the Hood — 1px Hairline Bento */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionKicker}>Engineering</span>
              <h2 className={styles.sectionHeading}>Built for real-world reliability</h2>
              <p className={styles.sectionSub}>Click any card to inspect the exact source file on GitHub.</p>
            </div>
          </div>

          <div className={styles.bentoGrid}>
            {FEATURES.map((card) => (
              <a
                key={card.file}
                href={githubFileUrl(card.file)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.bentoCard}
              >
                <span className={styles.bentoTag}>{card.tag}</span>
                <h3 className={styles.bentoTitle}>{card.title}</h3>
                <p className={styles.bentoDesc}>{card.desc}</p>
                <div className={styles.bentoCode}>
                  <span>{card.file}</span>
                  <span aria-hidden="true">↗</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className={styles.ctaBand}>
          <div>
            <h2>Explore the live workspace.</h2>
            <p>No sign-up needed. Browse real screens, search records, and download CSV or GDPR JSON exports.</p>
          </div>
          <div className={styles.ctas}>
            <a href="/demo" className={styles.buttonPrimary}>
              Open Live Demo →
            </a>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className={styles.buttonSecondary}>
              GitHub ↗
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <span>Lead Intelligence Platform · Next.js, TypeScript &amp; Supabase</span>
          <div className={styles.footerLinks}>
            <a href="/demo">Live Demo</a>
            <Link href="/architecture">How It&apos;s Built</Link>
            <Link href="/privacy">Privacy</Link>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <Link href="/login">Admin</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

import Link from "next/link";
import styles from "../crm/crm.module.css";
import { isDemoEnabled } from "@/lib/demo";
import { login } from "./actions";

export const metadata = {
  title: "Sign In · Lead Intelligence",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "Wrong email or password.",
  unapproved: "This account hasn't been approved yet.",
  ratelimited: "Too many login attempts. Please wait a minute.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? MESSAGES[error] : undefined;
  const demoEnabled = isDemoEnabled();

  return (
    <main className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Link href="/" className={styles.muted} style={{ fontSize: 13 }}>
            ← Back to home
          </Link>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "var(--text)",
              color: "var(--bg)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </span>
        </div>

        <h1 className={styles.loginTitle}>Lead Intelligence</h1>
        <p className={styles.muted} style={{ fontSize: 13.5, margin: "0 0 20px" }}>
          Jump into the live demo or sign in as an admin.
        </p>

        {demoEnabled && (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Want to look around?</span>
              <span className={`${styles.badge} ${styles.badgeGood}`}>No signup</span>
            </div>
            <p className={styles.muted} style={{ fontSize: 12.5, margin: "0 0 12px" }}>
              Explore the dashboard, scored prospects, deal board, and GDPR tools with sample data.
            </p>
            <a href="/demo" className={styles.buttonPrimary} style={{ width: "100%" }}>
              Open Live Demo →
            </a>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "0 0 14px",
            fontSize: 11.5,
            color: "var(--faint)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span>Admin login</span>
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <form action={login}>
          {message && <div className={styles.errorBanner}>{message}</div>}

          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            className={styles.input}
          />

          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={styles.input}
          />

          <button type="submit" className={styles.buttonSecondary} style={{ width: "100%", marginTop: 16 }}>
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}

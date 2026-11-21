import Link from "next/link";
import styles from "./crm.module.css";

export function SandboxBanner() {
  return (
    <div className={styles.sandboxBar} role="status" aria-label="Demo mode notice">
      <div className={styles.sandboxInner}>
        <div className={styles.sandboxLead}>
          <span className={styles.sandboxDot} />
          <span className={styles.sandboxDesktopText}>
            <strong>Demo mode</strong> · View-only preview (search, CSV &amp; GDPR exports work live)
          </span>
          <span className={styles.sandboxMobileText}>
            <strong>Demo mode</strong> · View-only preview
          </span>
        </div>

        <Link href="/architecture" className={styles.sandboxArchLink}>
          How it&apos;s built ↗
        </Link>
      </div>
    </div>
  );
}

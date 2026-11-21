import styles from "./crm.module.css";

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  if (error) {
    const isDemoNotice = error.startsWith("Demo mode:");
    return <div className={isDemoNotice ? styles.notice : styles.errorBanner}>{error}</div>;
  }
  return <div className={styles.okBanner}>{ok}</div>;
}

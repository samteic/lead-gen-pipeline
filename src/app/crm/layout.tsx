import styles from "./crm.module.css";
import { requireUser } from "@/lib/auth";
import { logout } from "../login/actions";
import { CrmSidebar } from "./crm-sidebar";
import { SandboxBanner } from "./sandbox-banner";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className={styles.shell}>
      <CrmSidebar user={user} onLogout={logout} />
      <div className={styles.mainArea}>
        {user.isDemo && <SandboxBanner />}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./crm-sidebar.module.css";
import type { CurrentUser } from "@/lib/auth";

interface CrmSidebarProps {
  user: CurrentUser;
  onLogout: () => Promise<void>;
}

interface NavItem {
  href: string;
  label: string;
  matchPrefixes?: string[];
  icon: (active: boolean) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/crm/dashboard",
    label: "Overview",
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    href: "/crm/prospects",
    label: "Prospects",
    matchPrefixes: ["/crm/prospects"],
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    href: "/crm/companies",
    label: "Companies",
    matchPrefixes: ["/crm/companies"],
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="9" y1="6" x2="9" y2="6.01" />
        <line x1="15" y1="6" x2="15" y2="6.01" />
        <line x1="9" y1="10" x2="9" y2="10.01" />
        <line x1="15" y1="10" x2="15" y2="10.01" />
        <path d="M10 22v-4h4v4" />
      </svg>
    ),
  },
  {
    href: "/crm/pipeline",
    label: "Pipeline",
    matchPrefixes: ["/crm/pipeline", "/crm/opportunities"],
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="18" rx="1" />
        <rect x="10.5" y="3" width="5" height="13" rx="1" />
        <rect x="18" y="3" width="5" height="8" rx="1" />
      </svg>
    ),
  },
  {
    href: "/crm/outreach",
    label: "Outreach",
    matchPrefixes: ["/crm/outreach"],
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  {
    href: "/crm/tasks",
    label: "Tasks",
    matchPrefixes: ["/crm/tasks"],
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: "/crm/compliance",
    label: "Privacy",
    matchPrefixes: ["/crm/compliance"],
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    href: "/crm/search",
    label: "Search",
    matchPrefixes: ["/crm/search"],
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
];

export function CrmSidebar({ user, onLogout }: CrmSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isItemActive = (item: NavItem) => {
    if (item.matchPrefixes) {
      return item.matchPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix + "?")
      );
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const activeItem = NAV_ITEMS.find(isItemActive);
  const currentTitle = activeItem?.label ?? "Workspace";

  const displayName = user.fullName || (user.isDemo ? "Demo Visitor" : user.email);
  const displayRole = user.isDemo ? "View-only demo" : user.email;
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const renderNavContent = () => (
    <>
      <div>
        <div className={styles.brandSection}>
          <Link href="/" className={styles.brandLink} title="Lead Intelligence Home">
            <span className={styles.logoIcon}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            <span>Lead Intel</span>
          </Link>
          <span className={styles.crmBadge}>{user.isDemo ? "Demo" : "Admin"}</span>
        </div>

        <nav className={styles.navSection} aria-label="Workspace Navigation">
          <span className={styles.navGroupLabel}>Menu</span>
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.navLinkContent}>
                  {item.icon(active)}
                  <span>{item.label}</span>
                </span>
                {active && <span className={styles.activeDot} />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={styles.bottomSection}>
        <Link href="/architecture" className={styles.navLink} style={{ padding: "8px 10px", fontSize: 13 }}>
          <span className={styles.navLinkContent}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>How It&apos;s Built</span>
          </span>
        </Link>

        <div className={styles.userCard}>
          <span className={styles.userAvatar}>{initials}</span>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.userRole}>{displayRole}</span>
          </div>
        </div>

        <form action={onLogout}>
          <button type="submit" className={styles.signOutBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{user.isDemo ? "Exit Demo" : "Sign Out"}</span>
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <aside className={styles.desktopSidebar}>{renderNavContent()}</aside>

      {/* Ultra-Clean Native Mobile Header: Menu · Current Page · Exit */}
      <header className={styles.mobileHeader}>
        <button
          type="button"
          className={styles.mobileToggleBtn}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="8" x2="20" y2="8" />
            <line x1="4" y1="16" x2="20" y2="16" />
          </svg>
        </button>

        <div className={styles.mobileCenter}>
          <span className={styles.mobilePageTitle}>{currentTitle}</span>
        </div>

        <form action={onLogout}>
          <button
            type="submit"
            className={styles.mobileToggleBtn}
            title={user.isDemo ? "Exit Demo" : "Sign Out"}
            aria-label={user.isDemo ? "Exit Demo" : "Sign Out"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </form>
      </header>

      {isOpen && (
        <>
          <div className={styles.mobileBackdrop} onClick={() => setIsOpen(false)} />
          <div className={styles.mobileDrawer} role="dialog" aria-modal="true" aria-label="Workspace menu">
            {renderNavContent()}
          </div>
        </>
      )}
    </>
  );
}

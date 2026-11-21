"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GITHUB_REPO_URL } from "@/lib/demo";
import { BrandLogo } from "./brand-logo";
import styles from "./landing-navbar.module.css";

export function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={styles.topbarWrapper}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brandWrap} title="Lead Intelligence">
          <BrandLogo size={26} />
          <span className={styles.brand}>Lead Intelligence</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Main Navigation">
          <Link href="/architecture" className={styles.navLink}>
            How It&apos;s Built
          </Link>
          <Link href="/privacy" className={styles.navLink}>
            Privacy
          </Link>
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className={styles.navLink}>
            GitHub ↗
          </a>
          <a href="/demo" className={styles.buttonPrimary}>
            Live Demo →
          </a>
        </nav>

        <div className={styles.mobileActions}>
          <a href="/demo" className={styles.mobileDemoBtn}>
            Live Demo
          </a>
          <button
            type="button"
            className={styles.mobileToggleBtn}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="8" x2="20" y2="8" />
                <line x1="4" y1="16" x2="20" y2="16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className={styles.mobileBackdrop} onClick={() => setMenuOpen(false)} />
          <nav className={styles.mobileMenu} aria-label="Mobile Navigation">
            <Link href="/" onClick={() => setMenuOpen(false)} className={styles.mobileMenuItem}>
              <span>Overview</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/architecture" onClick={() => setMenuOpen(false)} className={styles.mobileMenuItem}>
              <span>How It&apos;s Built</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/privacy" onClick={() => setMenuOpen(false)} className={styles.mobileMenuItem}>
              <span>Privacy &amp; GDPR</span>
              <span aria-hidden="true">→</span>
            </Link>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className={styles.mobileMenuItem}>
              <span>GitHub Source</span>
              <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </>
      )}
    </div>
  );
}

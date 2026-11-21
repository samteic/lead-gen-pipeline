import Link from "next/link";
import styles from "./privacy.module.css";
import { getSenderIdentity } from "@/lib/compliance/sender-identity";
import { LandingNavbar } from "../landing-navbar";

export const metadata = {
  title: "Privacy Notice | Lead Intelligence Platform",
  description: "B2B data governance, privacy policy, and legal rights under GDPR Articles 15 and 17.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const senderResult = getSenderIdentity();
  const identity = senderResult.ok
    ? senderResult.identity
    : {
        businessName: "Lead Intelligence Platform",
        businessAddress: "San Francisco, CA",
        senderName: "Data Governance & Compliance Team",
        privacyNoticeUrl: "/privacy",
        baseUrl: "/",
      };

  return (
    <div className={styles.shell}>
      {/* Background Micro-Grid */}
      <div className={styles.gridCanvas} aria-hidden="true" />

      {/* Responsive Navbar */}
      <LandingNavbar />

      <main className={styles.content}>
        {/* Page Header */}
        <div className={styles.header}>
          <span className={styles.kicker}>Data Policy</span>
          <h1 className={styles.title}>Privacy Notice</h1>
          <p className={styles.updated}>Last updated: October 2026</p>
        </div>

        {/* Quick Summary Card */}
        <div className={styles.summaryCard}>
          <h2 className={styles.summaryTitle}>Quick summary</h2>
          <ul className={styles.summaryList}>
            <li>We only send business-to-business (B2B) emails relevant to professional roles.</li>
            <li>We do not sell, rent, or trade your data to third parties.</li>
            <li>Every email has a working 1-click unsubscribe link at the bottom.</li>
            <li>When you unsubscribe, your email is replaced with a one-way hash so you are never emailed again.</li>
            <li>Contacts with no replies or active deals are automatically deleted after 180 days.</li>
          </ul>
        </div>

        {/* 1. Who We Are */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Who we are</h2>
          <p className={styles.paragraph}>
            This notice covers outreach conducted by <strong>{identity.businessName}</strong>. We act as the data
            controller for the professional contact details we process.
          </p>
          <div className={styles.infoCard}>
            <div><strong>Company:</strong> {identity.businessName}</div>
            <div><strong>Address:</strong> {identity.businessAddress}</div>
            <div><strong>Contact:</strong> {identity.senderName}</div>
          </div>
        </section>

        {/* 2. What We Collect */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. What we collect</h2>
          <p className={styles.paragraph}>
            We only collect public business information needed for commercial introductions:
          </p>
          <ul className={styles.list}>
            <li><strong>Name:</strong> First and last name.</li>
            <li><strong>Work role:</strong> Job title, department, and seniority.</li>
            <li><strong>Company info:</strong> Company name, website domain, and industry.</li>
            <li><strong>Work email:</strong> Corporate email address (e.g. name@company.com).</li>
          </ul>
          <p className={styles.paragraph}>
            We do not collect personal phone numbers, home addresses, payment info, or any sensitive personal data.
          </p>
        </section>

        {/* 3. Where We Find Data */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Where we find data</h2>
          <p className={styles.paragraph}>
            All contact information comes from public, work-related sources:
          </p>
          <ul className={styles.list}>
            <li>Public company websites, blogs, and team pages.</li>
            <li>Public open-source repositories and profiles (e.g. GitHub).</li>
            <li>Public business directories and verified B2B lists.</li>
          </ul>
        </section>

        {/* 4. Why We Send Emails */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Why we send emails</h2>
          <p className={styles.paragraph}>
            Under GDPR (Article 6(1)(f)) and PECR, we reach out based on <strong>Legitimate Interests</strong>:
          </p>
          <ul className={styles.list}>
            <li>We only reach out to businesses whose tech stack or role aligns with what we build.</li>
            <li>We keep messages concise and relevant to your work.</li>
            <li>We stop emailing immediately if you reply asking us to stop or click unsubscribe.</li>
          </ul>
        </section>

        {/* 5. How Long We Keep Data */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. How long we keep data</h2>
          <p className={styles.paragraph}>
            We delete inactive records automatically:
          </p>
          <ul className={styles.list}>
            <li><strong>180-Day Rule:</strong> If an outreach contact has no replies or active deals after 180 days, our retention system permanently deletes the record.</li>
            <li><strong>Unsubscribes:</strong> When you opt out, your name and email are wiped. We store only an irreversible SHA-256 hash on a suppression list so no future email can be sent to you.</li>
          </ul>
        </section>

        {/* 6. Your Rights */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Your rights</h2>
          <p className={styles.paragraph}>
            You have full control over your data under GDPR and CCPA:
          </p>
          <ul className={styles.list}>
            <li><strong>Opt out:</strong> Click the unsubscribe link at the bottom of any email we send.</li>
            <li><strong>Download your data (Article 15):</strong> Request a JSON export of all data held on you.</li>
            <li><strong>Permanent deletion (Article 17):</strong> Request that your contact details be deleted immediately.</li>
          </ul>
        </section>

        {/* Action Box */}
        <div className={styles.actionCard}>
          <h3 className={styles.actionTitle}>Want to opt out or delete your data?</h3>
          <p className={styles.actionText}>
            You can click the <strong>unsubscribe</strong> link in the footer of any email you received from us.
            Alternatively, reply to the email or write to <strong>{identity.businessName}</strong> at {identity.businessAddress} requesting deletion.
          </p>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <span>&copy; {new Date().getFullYear()} {identity.businessName}</span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/">Home</Link>
            <Link href="/login">Sign In</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

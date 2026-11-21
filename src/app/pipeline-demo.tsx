"use client";

import { useState } from "react";
import styles from "./page.module.css";

interface DemoStage {
  id: string;
  step: string;
  tab: string;
  note: string;
  cardTitle: string;
  badgeText: string;
  badgeTone: "good" | "neutral" | "warn";
  rows: Array<{ label: string; value: string; mono?: boolean }>;
  scoreBar?: number;
  json: string;
}

const STAGES: DemoStage[] = [
  {
    id: "raw",
    step: "01",
    tab: "Raw CSV",
    note: "Raw spreadsheet row arrives with messy capitalization, extra URL prefixes, and unformatted location.",
    cardTitle: "Incoming Row #14",
    badgeText: "Raw input",
    badgeTone: "warn",
    rows: [
      { label: "Company", value: "APEX CLOUD SYSTEMS INC." },
      { label: "Website", value: "https://www.apexcloud.io/", mono: true },
      { label: "Location", value: "san francisco, california" },
      { label: "Team size", value: "140" },
    ],
    json: `{
  "company_name": "APEX CLOUD SYSTEMS INC.",
  "website": "https://www.apexcloud.io/",
  "location": "san francisco, california",
  "employees": "140"
}`,
  },
  {
    id: "clean",
    step: "02",
    tab: "Cleaned",
    note: "Domain is normalized, name and city are formatted, and multi-tier checks confirm it's not a duplicate.",
    cardTitle: "Apex Cloud Systems",
    badgeText: "Unique",
    badgeTone: "neutral",
    rows: [
      { label: "Clean name", value: "Apex Cloud Systems Incorporated" },
      { label: "Domain", value: "apexcloud.io", mono: true },
      { label: "Location", value: "San Francisco, CA" },
      { label: "Duplicate check", value: "No match found" },
    ],
    json: `{
  "normalized_name": "Apex Cloud Systems Incorporated",
  "domain": "apexcloud.io",
  "location": "San Francisco, CA",
  "is_duplicate": false
}`,
  },
  {
    id: "enrich",
    step: "03",
    tab: "Audited",
    note: "Public website metadata is parsed, business model is identified, and the right decision-maker is verified.",
    cardTitle: "Signals & Contact",
    badgeText: "Verified email",
    badgeTone: "good",
    rows: [
      { label: "Model", value: "B2B SaaS · Cloud Infrastructure" },
      { label: "Contact", value: "Sarah Chen (VP of Engineering)" },
      { label: "Email", value: "sarah.chen@apexcloud.io", mono: true },
      { label: "Privacy", value: "GDPR basis logged" },
    ],
    json: `{
  "business_model": "B2B SaaS",
  "industry": "Cloud Infrastructure",
  "contact": "Sarah Chen — VP of Engineering",
  "email_status": "verified"
}`,
  },
  {
    id: "score",
    step: "04",
    tab: "Scored",
    note: "Company gets a transparent 0–100 score and moves directly onto the sales pipeline board.",
    cardTitle: "Apex Cloud Systems",
    badgeText: "High Fit · 94/100",
    badgeTone: "good",
    scoreBar: 94,
    rows: [
      { label: "Fit / Intent", value: "94 Fit · 88 Intent" },
      { label: "Pipeline stage", value: "Meeting Booked" },
      { label: "Deal value", value: "$36,000" },
      { label: "Next task", value: "Architecture walkthrough call" },
    ],
    json: `{
  "fit_score": 94,
  "intent_score": 88,
  "priority": "HIGH",
  "stage": "meeting_booked",
  "estimated_value": 36000
}`,
  },
];

export function PipelineDemo() {
  const [active, setActive] = useState(0);
  const [showJson, setShowJson] = useState(false);
  const stage = STAGES[active];

  const badgeClass =
    stage.badgeTone === "good"
      ? styles.visualBadgeGood
      : stage.badgeTone === "warn"
      ? styles.visualBadgeWarn
      : styles.visualBadgeNeutral;

  return (
    <div className={styles.demoCard}>
      <div className={styles.demoTopBar}>
        <span className={styles.demoTopLeft}>
          <span className={styles.badgeDot} />
          <span>Example · Raw data to qualified lead</span>
        </span>

        <button type="button" onClick={() => setShowJson((v) => !v)} className={styles.toggleJsonBtn}>
          {showJson ? "Card view" : "JSON"}
        </button>
      </div>

      <div className={styles.demoTabs} role="tablist" aria-label="Pipeline stages">
        {STAGES.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={idx === active}
            onClick={() => setActive(idx)}
            className={`${styles.demoTab} ${idx === active ? styles.demoTabActive : ""}`}
          >
            <span className={styles.demoTabStep}>{s.step}</span>
            <span className={styles.demoTabLabel}>{s.tab}</span>
          </button>
        ))}
      </div>

      <div className={styles.demoBody} role="tabpanel">
        <p className={styles.demoNote}>{stage.note}</p>

        {showJson ? (
          <pre className={styles.demoCodeBlock}>
            <code>{stage.json}</code>
          </pre>
        ) : (
          <div className={styles.visualCard}>
            <div className={styles.visualHeader}>
              <span className={styles.visualTitle}>{stage.cardTitle}</span>
              <span className={badgeClass}>{stage.badgeText}</span>
            </div>

            {stage.scoreBar !== undefined && (
              <div className={styles.scoreBarTrack}>
                <div className={styles.scoreBarFill} style={{ width: `${stage.scoreBar}%` }} />
              </div>
            )}

            <div className={styles.visualRows}>
              {stage.rows.map((r) => (
                <div key={r.label} className={styles.visualRow}>
                  <span className={styles.visualKey}>{r.label}</span>
                  <span className={r.mono ? styles.visualValMono : styles.visualVal}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.demoFooterRow}>
          <span>Click steps 01–04 to trace the pipeline</span>
          <a href="/demo" className={styles.demoFooterLink}>
            Open full workspace →
          </a>
        </div>
      </div>
    </div>
  );
}

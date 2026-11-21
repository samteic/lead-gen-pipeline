"use client";

import { useState } from "react";
import styles from "@/app/crm/crm.module.css";

interface CopyPitchButtonProps {
  subject: string;
  body: string;
  recipientEmail?: string | null;
}

export function CopyPitchButton({ subject, body, recipientEmail }: CopyPitchButtonProps) {
  const [copiedType, setCopiedType] = useState<"all" | "body" | null>(null);

  const copyToClipboard = async (text: string, type: "all" | "body") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2200);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const fullMessage = `Subject: ${subject}\n\n${body}`;
  const mailtoUrl = recipientEmail
    ? `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 16,
        padding: "12px 14px",
        background: "var(--bg-subtle)",
        borderRadius: 8,
        border: "1px solid var(--border)",
      }}
    >
      <button
        type="button"
        onClick={() => copyToClipboard(body, "body")}
        className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>{copiedType === "body" ? "Copied body" : "Copy body"}</span>
      </button>

      <button
        type="button"
        onClick={() => copyToClipboard(fullMessage, "all")}
        className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>{copiedType === "all" ? "Copied with subject" : "Copy with subject"}</span>
      </button>

      {recipientEmail && (
        <a
          href={mailtoUrl}
          className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <span>Open in email client</span>
        </a>
      )}
    </div>
  );
}

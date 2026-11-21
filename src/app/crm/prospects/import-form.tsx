"use client";

import { useActionState } from "react";
import styles from "@/app/crm/crm.module.css";
import { importCompaniesCsv } from "@/app/crm/prospect-actions";
import type { ImportState } from "@/lib/crm/import-types";

const initialState: ImportState = { status: "idle" };

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importCompaniesCsv, initialState);

  return (
    <>
      <form action={formAction}>
        <div className={styles.formGrid}>
          <label className={styles.label}>
            CSV file
            <input type="file" name="file" accept=".csv,text/csv" required className={styles.input} />
          </label>
          <label className={styles.label}>
            Label for this batch
            <input name="source" placeholder="csv_import" maxLength={40} className={styles.input} />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className={styles.buttonPrimary}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            opacity: pending ? 0.75 : 1,
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          {pending && (
            <svg
              style={{ animation: "spin 0.8s linear infinite", width: 14, height: 14 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
            </svg>
          )}
          <span>{pending ? "Validating & deduplicating..." : "Import CSV"}</span>
        </button>
      </form>

      {state.status === "error" && (
        <div className={styles.errorBanner} style={{ marginTop: 14 }}>
          {state.message}
        </div>
      )}

      {state.status === "done" && (
        <div style={{ marginTop: 14 }}>
          <div className={state.inserted > 0 || state.contactsCreated > 0 ? styles.okBanner : styles.notice}>
            <strong>Import completed:</strong> Saved {state.inserted} new companies and{" "}
            <strong>{state.contactsCreated} contacts</strong> into the qualification queue.
            {state.duplicates > 0 && ` (${state.duplicates} duplicate companies matched).`}
            {state.invalid > 0 && ` ${state.invalid} invalid rows skipped.`}
            {state.failed > 0 && ` ${state.failed} rows failed to save.`}
          </div>

          {state.problems.length > 0 && (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Company</th>
                    <th>Not imported because</th>
                  </tr>
                </thead>
                <tbody>
                  {state.problems.map((p) => (
                    <tr key={`${p.row}-${p.reason}`}>
                      <td>{p.row}</td>
                      <td>{p.name}</td>
                      <td>{p.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {state.truncated && <p className={styles.muted}>Showing the first {state.problems.length} problems.</p>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
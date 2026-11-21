"use client";

import { useFormStatus } from "react-dom";
import styles from "@/app/crm/crm.module.css";

interface SubmitButtonProps {
  label: string;
  pendingLabel: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function SubmitButton({
  label,
  pendingLabel,
  className = styles.buttonPrimary,
  style,
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      style={{
        ...style,
        opacity: pending || disabled ? 0.7 : 1,
        cursor: pending || disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      {pending && (
        <svg
          style={{
            animation: "spin 0.8s linear infinite",
            width: 14,
            height: 14,
            flexShrink: 0,
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
        </svg>
      )}
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}

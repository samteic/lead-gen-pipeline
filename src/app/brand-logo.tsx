export function BrandLogo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="8" fill="var(--text)" />
      <path
        d="M8 8H10C10.552 8 11 8.448 11 9V20H16C16.552 20 17 20.448 17 21V23C17 23.552 16.552 24 16 24H8C7.448 24 7 23.552 7 23V9C7 8.448 7.448 8 8 8Z"
        fill="var(--bg)"
      />
      <rect x="21" y="8" width="4" height="16" rx="1" fill="var(--bg)" />
    </svg>
  );
}

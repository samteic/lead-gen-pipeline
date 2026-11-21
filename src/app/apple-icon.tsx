import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111214",
          borderRadius: 40,
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32" fill="none">
          <path
            d="M8 8H10C10.552 8 11 8.448 11 9V20H16C16.552 20 17 20.448 17 21V23C17 23.552 16.552 24 16 24H8C7.448 24 7 23.552 7 23V9C7 8.448 7.448 8 8 8Z"
            fill="#FAF9F6"
          />
          <rect x="21" y="8" width="4" height="16" rx="1" fill="#FAF9F6" />
        </svg>
      </div>
    ),
    { ...size }
  );
}

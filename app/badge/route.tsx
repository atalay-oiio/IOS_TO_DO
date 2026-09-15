import { ImageResponse } from "next/og";

// Android bildirim çubuğundaki tek renkli küçük ikon (şeffaf zemin üzerinde beyaz)
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="76" height="76" viewBox="0 0 24 24">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: 96, height: 96 }
  );
}

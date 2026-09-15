// Ana ekran ikonu: gradyan zemin üzerinde cam bir onay işareti
export function AppIcon({ size }: { size: number }) {
  const s = size / 512;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #19d3ff 0%, #6a4bff 50%, #ff4fb8 100%)",
      }}
    >
      <div
        style={{
          width: 300 * s,
          height: 300 * s,
          borderRadius: 90 * s,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.22)",
          border: `${6 * s}px solid rgba(255,255,255,0.5)`,
        }}
      >
        <svg width={170 * s} height={170 * s} viewBox="0 0 24 24">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

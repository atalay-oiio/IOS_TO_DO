export function ProgressRing({ percent, size = 88 }: { percent: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="ring"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Tamamlanma oranı"
    >
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--ring-1)" }} />
            <stop offset="50%" style={{ stopColor: "var(--ring-2)" }} />
            <stop offset="100%" style={{ stopColor: "var(--ring-3)" }} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} className="ring-track" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className="ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c - (percent / 100) * c}
          style={{ opacity: percent === 0 ? 0 : 1 }}
        />
      </svg>
      <span className="ring-label">
        {percent}
        <small>%</small>
      </span>
    </div>
  );
}

export function Confetti() {
  const colors = ["#7cf8ff", "#8b7bff", "#ff7ad9", "#ffd166", "#6effa8", "#0A84FF"];
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 70 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 97) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 14) * 0.07}s`,
            animationDuration: `${2.4 + (i % 5) * 0.35}s`,
            rotate: `${i * 37}deg`,
            width: i % 3 === 0 ? 7 : 9,
            height: i % 3 === 0 ? 7 : 14,
            borderRadius: i % 3 === 0 ? "50%" : 3,
          }}
        />
      ))}
    </div>
  );
}

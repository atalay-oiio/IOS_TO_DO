import type { CSSProperties } from "react";

// Renk paleti: her renk tek tonlu ya da ikili geçişli olabilir.
// solid → metin/kenarlık gibi tek renk gereken yerler, solidLight → açık temada okunaklı karşılığı.
export type Paint = {
  id: string;
  name: string;
  from: string;
  mid?: string;
  to: string;
  solid: string;
  solidLight?: string;
};

export const SOLIDS: Paint[] = [
  { id: "blue", name: "Mavi", from: "#0A84FF", to: "#0A84FF", solid: "#0A84FF", solidLight: "#0069D9" },
  { id: "indigo", name: "İndigo", from: "#5E5CE6", to: "#5E5CE6", solid: "#5E5CE6", solidLight: "#4744CC" },
  { id: "purple", name: "Mor", from: "#BF5AF2", to: "#BF5AF2", solid: "#BF5AF2", solidLight: "#9A34D0" },
  { id: "pink", name: "Pembe", from: "#FF375F", to: "#FF375F", solid: "#FF375F", solidLight: "#E01046" },
  { id: "orange", name: "Turuncu", from: "#FF9F0A", to: "#FF9F0A", solid: "#FF9F0A", solidLight: "#D97800" },
  { id: "green", name: "Yeşil", from: "#30D158", to: "#30D158", solid: "#30D158", solidLight: "#1A9E3E" },
  { id: "teal", name: "Turkuaz", from: "#40CBE0", to: "#40CBE0", solid: "#40CBE0", solidLight: "#0E8FA6" },
  { id: "graphite", name: "Grafit", from: "#8E8E93", to: "#8E8E93", solid: "#8E8E93", solidLight: "#636368" },
];

export const GRADIENTS: Paint[] = [
  { id: "aurora", name: "Aurora", from: "#7CF8FF", mid: "#8B7BFF", to: "#FF7AD9", solid: "#8B7BFF", solidLight: "#6A5AE0" },
  { id: "sunset", name: "Gün batımı", from: "#FFB020", mid: "#FF7A45", to: "#FF375F", solid: "#FF7A45", solidLight: "#D9481F" },
  { id: "ocean", name: "Okyanus", from: "#5BE7FF", mid: "#2F9BFF", to: "#3B4FE0", solid: "#2F9BFF", solidLight: "#1266CC" },
  { id: "forest", name: "Orman", from: "#9BF6A0", mid: "#3FD67F", to: "#0FA7A0", solid: "#2FC489", solidLight: "#0E8F68" },
  { id: "lavender", name: "Lavanta", from: "#D6A8FF", mid: "#A77BFF", to: "#6A5AE0", solid: "#A77BFF", solidLight: "#7B4FE0" },
  { id: "peach", name: "Şeftali", from: "#FFD59E", mid: "#FF9E8A", to: "#FF6E9C", solid: "#FF9E8A", solidLight: "#E05A78" },
  { id: "midnight", name: "Gece", from: "#6E8BFF", mid: "#7C5CFF", to: "#B14BFF", solid: "#7C5CFF", solidLight: "#5A3ADB" },
];

export const PAINTS = [...GRADIENTS, ...SOLIDS];
export const DEFAULT_PAINT = "aurora";
export const DEFAULT_LIST_PAINTS = ["blue", "orange", "green"];

const byId = new Map(PAINTS.map((p) => [p.id, p]));

// Eski kayıtlarda renk "#0A84FF" gibi düz kod olarak tutuluyordu; ikisini de kabul et.
export function resolvePaint(value: string | undefined | null): Paint {
  if (value) {
    const known = byId.get(value);
    if (known) return known;
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      const match = PAINTS.find((p) => p.solid.toLowerCase() === value.toLowerCase());
      if (match) return match;
      return { id: value, name: "Özel", from: value, to: value, solid: value };
    }
  }
  return byId.get(DEFAULT_PAINT)!;
}

export const isPaintId = (value: string) => byId.has(value);

export function paintBackground(p: Paint) {
  if (p.from === p.to) return p.from;
  return `linear-gradient(135deg, ${p.from}, ${p.mid ? `${p.mid} 55%, ` : ""}${p.to})`;
}

// Nokta, onay dairesi ve liste rozetleri için: --cg zemin, --c tek renk (kenarlık vb.)
export function paintStyle(value: string | undefined | null): CSSProperties {
  const p = resolvePaint(value);
  return { "--c": p.solid, "--cg": paintBackground(p) } as CSSProperties;
}

"use client";

// Android'de hafif dokunsal geri bildirim (iPhone'daki "haptic" hissi). Desteklemeyen tarayıcıda
// (iPhone Safari, masaüstü) sessizce hiçbir şey yapmaz; Ayarlar → Titreşim ile kapatılabilir.
export type Haptic = "select" | "tap" | "success" | "error";

const PATTERNS: Record<Haptic, number | number[]> = {
  select: 6, // anahtar, kaydırıcı adımı, tuş takımı, kaydırma eşiği
  tap: 12, // görev tamamlama, silme, sürüklemeye başlama
  success: [14, 70, 24], // hepsi bitti
  error: [26, 60, 26, 60, 26], // yanlış PIN
};

let enabled = true;

export const setHaptics = (on: boolean) => {
  enabled = on;
};

export const hapticsSupported = () => typeof navigator !== "undefined" && "vibrate" in navigator;

export function haptic(kind: Haptic = "tap") {
  if (!enabled || !hapticsSupported()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {}
}

"use client";

// Android'de hafif dokunsal geri bildirim (iPhone'daki "haptic" hissi). Desteklemeyen tarayıcıda
// (iPhone Safari, masaüstü) sessizce hiçbir şey yapmaz; Ayarlar → Titreşim ile kapatılabilir.
export type Haptic = "select" | "tap" | "success" | "error";

// Android titreşim motorlarının çoğu ~15 ms'den kısa komutlarda hiç dönmez; süreler hissedilir aralıkta
const PATTERNS: Record<Haptic, number | number[]> = {
  select: 14, // anahtar, kaydırıcı adımı, tuş takımı, kaydırma eşiği
  tap: 24, // görev tamamlama, silme, sürüklemeye başlama
  success: [24, 80, 34], // hepsi bitti
  error: [45, 70, 45, 70, 45], // yanlış PIN
};

let enabled = true;

export const setHaptics = (on: boolean) => {
  enabled = on;
};

export const hapticsSupported = () => typeof navigator !== "undefined" && "vibrate" in navigator;

// Ayarlardaki "Titreşimi dene": belirgin bir titreşim; tarayıcı engellerse false döner
export function testVibration() {
  if (!hapticsSupported()) return false;
  try {
    return navigator.vibrate([200, 100, 200]);
  } catch {
    return false;
  }
}

export function haptic(kind: Haptic = "tap") {
  if (!enabled || !hapticsSupported()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {}
}

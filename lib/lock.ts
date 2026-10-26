"use client";

// Uygulama kilidi: parmak izi (varsa) + PIN. Bu bir ekran kilididir; veriler şifrelenmez.
// len/iter olmayan özet eski 4 haneli PIN'dir.
export type PinHash = { salt: string; hash: string; len?: number; iter?: number };

export type LockConfig = {
  enabled: boolean;
  pin: PinHash | null;
  credentialId: string | null; // parmak izi/yüz için kayıtlı kimlik
  delay: number; // arka plandan dönüşte kaç ms sonra kilitlensin
  fails: number; // art arda yanlış PIN sayısı
  lastFail: number; // son yanlış denemenin zamanı (ms)
  hideContent: boolean; // kilit açıkken bildirimde görev adı yerine genel metin
};

const KEY = "glass-todo:lock";
export const PIN_LENGTH = 6; // yeni PIN'ler; "PIN seçenekleri" ile 4 hane de seçilebilir
export const DEFAULT_LOCK: LockConfig = {
  enabled: false,
  pin: null,
  credentialId: null,
  delay: 0,
  fails: 0,
  lastFail: 0,
  hideContent: true,
};

export const pinLength = (pin: PinHash | null) => pin?.len ?? 4;

// Yanlış PIN'den sonra bekleme, iOS gibi artarak (en fazla 12 dk; veriler hiç silinmez):
// 5. → 30 sn, 6. → 1 dk, 7. → 5 dk, 8. → 10 dk, 9. ve sonrası → 12 dk
const WAITS = [30_000, 60_000, 300_000, 600_000, 720_000];
export const waitAfter = (fails: number) => (fails < 5 ? 0 : WAITS[Math.min(fails - 5, WAITS.length - 1)]);

// Kalan bekleme süresi; cihaz saati geri alınırsa bekleme baştan başlar
export function lockedFor(cfg: LockConfig, now = Date.now()) {
  const wait = waitAfter(cfg.fails);
  if (!wait) return 0;
  return now < cfg.lastFail ? wait : Math.max(0, cfg.lastFail + wait - now);
}

export const DELAY_OPTIONS = [
  { value: 0, label: "Hemen" },
  { value: 60_000, label: "1 dk" },
  { value: 300_000, label: "5 dk" },
];

export function loadLock(): LockConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const cfg: LockConfig = { ...DEFAULT_LOCK, ...JSON.parse(raw) };
      return { ...cfg, fails: Number(cfg.fails) || 0, lastFail: Number(cfg.lastFail) || 0 };
    }
  } catch {}
  return DEFAULT_LOCK;
}

export function saveLock(cfg: LockConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {}
}

// ---------- PIN ----------
const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const ITERATIONS = 600_000; // PBKDF2-SHA256 için OWASP önerisi
const LEGACY_ITERATIONS = 150_000;

async function derive(pin: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return b64(bits);
}

export async function makePin(pin: string): Promise<PinHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), hash: await derive(pin, salt, ITERATIONS), len: pin.length, iter: ITERATIONS };
}

export async function checkPin(pin: string, stored: LockConfig["pin"]) {
  if (!stored) return false;
  return (await derive(pin, fromB64(stored.salt), stored.iter ?? LEGACY_ITERATIONS)) === stored.hash;
}

// Eski, daha zayıf özet doğru girişten sonra yenisiyle değiştirilir
export const pinOutdated = (stored: PinHash) => (stored.iter ?? LEGACY_ITERATIONS) < ITERATIONS;

// ---------- Parmak izi / yüz (WebAuthn) ----------
export async function biometricAvailable() {
  try {
    return (
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

const challenge = () => crypto.getRandomValues(new Uint8Array(32));

export async function registerBiometric(): Promise<string | null> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge(),
        rp: { name: "Glass Todo", id: location.hostname },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "glass-todo", displayName: "Glass Todo" },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    return cred ? b64(cred.rawId) : null;
  } catch {
    return null;
  }
}

export async function verifyBiometric(credentialId: string) {
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: challenge(),
        rpId: location.hostname,
        allowCredentials: [{ type: "public-key", id: fromB64(credentialId) as BufferSource }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return !!res;
  } catch {
    return false;
  }
}

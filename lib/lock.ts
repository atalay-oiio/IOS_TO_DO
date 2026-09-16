"use client";

// Uygulama kilidi: parmak izi (varsa) + PIN. Bu bir ekran kilididir; veriler şifrelenmez.
export type LockConfig = {
  enabled: boolean;
  pin: { salt: string; hash: string } | null;
  credentialId: string | null; // parmak izi/yüz için kayıtlı kimlik
  delay: number; // arka plandan dönüşte kaç ms sonra kilitlensin
};

const KEY = "glass-todo:lock";
export const PIN_LENGTH = 4;
export const DEFAULT_LOCK: LockConfig = { enabled: false, pin: null, credentialId: null, delay: 0 };

export const DELAY_OPTIONS = [
  { value: 0, label: "Hemen" },
  { value: 60_000, label: "1 dk" },
  { value: 300_000, label: "5 dk" },
];

export function loadLock(): LockConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_LOCK, ...JSON.parse(raw) };
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

async function derive(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 150_000, hash: "SHA-256" },
    key,
    256
  );
  return b64(bits);
}

export async function makePin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), hash: await derive(pin, salt) };
}

export async function checkPin(pin: string, stored: LockConfig["pin"]) {
  if (!stored) return false;
  return (await derive(pin, fromB64(stored.salt))) === stored.hash;
}

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

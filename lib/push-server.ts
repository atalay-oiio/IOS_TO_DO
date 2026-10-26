import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import webpush from "web-push";
import { Client, Receiver } from "@upstash/qstash";

const env = process.env;

// Bildirimler için gereken tüm ortam değişkenleri Vercel'de tanımlı mı?
export const pushConfigured = () =>
  !!(
    env.VAPID_PUBLIC_KEY &&
    env.VAPID_PRIVATE_KEY &&
    env.QSTASH_TOKEN &&
    env.QSTASH_CURRENT_SIGNING_KEY &&
    env.QSTASH_NEXT_SIGNING_KEY
  );

export const qstash = () =>
  new Client({ token: env.QSTASH_TOKEN!, ...(env.QSTASH_URL ? { baseUrl: env.QSTASH_URL } : {}) });

export const receiver = () =>
  new Receiver({ currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY!, nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY! });

export const SEND_PATH = "/api/push/send";

export type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };
export type Payload = { title: string; body: string; tag: string; id?: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

// Yalnızca tarayıcıların gerçek bildirim servisleri (Chrome/Android, Firefox, Edge, Safari);
// sunucu başka adreslere istek göndermek için kullanılamaz.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /\.notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
];

export function parseSubscription(v: unknown): Subscription | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof o.endpoint !== "string" || !o.endpoint.startsWith("https://") || o.endpoint.length > 1000) return null;
  if (typeof o.keys?.p256dh !== "string" || typeof o.keys?.auth !== "string") return null;
  if (o.keys.p256dh.length > 200 || o.keys.auth.length > 100) return null;
  let host: string;
  try {
    host = new URL(o.endpoint).hostname;
  } catch {
    return null;
  }
  if (!PUSH_HOSTS.some((re) => re.test(host))) return null;
  return { endpoint: o.endpoint, keys: { p256dh: o.keys.p256dh, auth: o.keys.auth } };
}

export function parsePayload(v: Record<string, unknown>): Payload {
  return {
    title: str(v.title, 200) || "Hatırlatma",
    body: str(v.body, 300),
    tag: str(v.tag, 100) || "glass-todo",
    id: str(v.id, 100) || undefined,
  };
}

// Küçük bir JSON nesnesi bekler (bildirim isteği birkaç yüz bayttır)
export async function readJson(req: Request, max = 8_000): Promise<Record<string, unknown> | null> {
  const text = await req.text().catch(() => "");
  if (!text || text.length > max) return null;
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Yalnızca uygulamanın kendi sayfası ve service worker'ı çağırabilir: başka bir site, ziyaretçilerinin
// tarayıcısı üzerinden istek atamaz. (Tarayıcı dışı istemcilere karşı Vercel'deki hız sınırı var.)
export function fromOurApp(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}

// QStash'e giden içerik (görev başlığı, bildirim anahtarları) şifrelenir; Upstash panelinde okunamaz.
// Anahtar mevcut VAPID gizli anahtarından türetilir, Vercel'de ayrı bir ayar gerekmez.
const sealKey = () => Buffer.from(hkdfSync("sha256", env.VAPID_PRIVATE_KEY!, "glass-todo", "qstash-payload", 32));

export function seal(data: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealKey(), iv);
  const box = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return { v: 1, box: Buffer.concat([iv, cipher.getAuthTag(), box]).toString("base64url") };
}

// Şifreli mesajı açar; bu güncellemeden önce zamanlanmış (şifresiz) mesajlar olduğu gibi döner
export function unseal(v: Record<string, unknown>): Record<string, unknown> | null {
  if (v.v !== 1) return v;
  try {
    const raw = Buffer.from(String(v.box), "base64url");
    const decipher = createDecipheriv("aes-256-gcm", sealKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

// Doğrulanmış QStash imzasının hangi yol için verildiği (alan adı Vercel'de değişebilir, yol değişmez)
export function signedPath(signature: string) {
  try {
    const { sub } = JSON.parse(Buffer.from(signature.split(".")[1], "base64url").toString("utf8")) as { sub?: string };
    return sub ? new URL(sub).pathname : null;
  } catch {
    return null;
  }
}

export function sendPush(sub: Subscription, payload: Payload & { snooze?: boolean }, origin: string) {
  const subject = env.VAPID_SUBJECT || origin.replace(/^http:/, "https:");
  webpush.setVapidDetails(subject, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  return webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
}

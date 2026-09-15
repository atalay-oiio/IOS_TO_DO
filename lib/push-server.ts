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

export type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };
export type Payload = { title: string; body: string; tag: string; id?: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export function parseSubscription(v: unknown): Subscription | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof o.endpoint !== "string" || !o.endpoint.startsWith("https://")) return null;
  if (typeof o.keys?.p256dh !== "string" || typeof o.keys?.auth !== "string") return null;
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

export function sendPush(sub: Subscription, payload: Payload & { snooze?: boolean }, origin: string) {
  const subject = env.VAPID_SUBJECT || origin.replace(/^http:/, "https:");
  webpush.setVapidDetails(subject, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  return webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
}

import { parsePayload, parseSubscription, pushConfigured, receiver, sendPush } from "@/lib/push-server";

// Yalnızca QStash çağırır (imza doğrulanır); telefona anlık bildirimi gönderir.
export async function POST(req: Request) {
  if (!pushConfigured()) return new Response("not configured", { status: 503 });
  const raw = await req.text();
  const signature = req.headers.get("upstash-signature") ?? "";
  const valid = await receiver()
    .verify({ signature, body: raw, clockTolerance: 30 })
    .catch(() => false);
  if (!valid) return new Response("invalid signature", { status: 401 });

  const data = JSON.parse(raw) as Record<string, unknown>;
  const subscription = parseSubscription(data.subscription);
  if (!subscription) return new Response("bad subscription"); // tekrar denemeye gerek yok

  try {
    await sendPush(subscription, { ...parsePayload(data), snooze: true }, new URL(req.url).origin);
    return new Response("ok");
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    // Abonelik artık yok (uygulama kaldırılmış / izin geri alınmış)
    if (code === 404 || code === 410) return new Response("gone");
    return new Response("push failed", { status: 500 });
  }
}

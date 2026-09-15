import { parsePayload, parseSubscription, pushConfigured, qstash } from "@/lib/push-server";

// Hatırlatmayı QStash'e bırakır; zamanı gelince QStash /api/push/send'i çağırır.
const MAX_AHEAD = 7 * 24 * 3_600_000;

export async function POST(req: Request) {
  if (!pushConfigured()) return Response.json({ error: "not-configured" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const subscription = parseSubscription(body?.subscription);
  const at = Number(body?.at);
  if (!body || !subscription || !Number.isFinite(at) || at > Date.now() + MAX_AHEAD)
    return Response.json({ error: "bad-request" }, { status: 400 });

  try {
    const res = await qstash().publishJSON({
      url: new URL("/api/push/send", req.url).toString(),
      body: { subscription, ...parsePayload(body) },
      notBefore: Math.max(Math.floor(at / 1000), Math.floor(Date.now() / 1000)),
      retries: 3,
    });
    return Response.json({ messageId: res.messageId });
  } catch (e) {
    return Response.json({ error: "qstash", detail: String(e) }, { status: 502 });
  }
}

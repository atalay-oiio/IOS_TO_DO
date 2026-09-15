import { pushConfigured, qstash } from "@/lib/push-server";

// Görev silinince/değişince zamanlanmış bildirimi iptal eder.
export async function POST(req: Request) {
  if (!pushConfigured()) return Response.json({ error: "not-configured" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { messageId?: unknown } | null;
  const id = typeof body?.messageId === "string" && body.messageId.length < 200 ? body.messageId : null;
  if (!id) return Response.json({ error: "bad-request" }, { status: 400 });
  try {
    await qstash().messages.delete(id);
  } catch {
    // Zaten teslim edilmiş ya da silinmiş olabilir
  }
  return Response.json({ ok: true });
}

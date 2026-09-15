import { pushConfigured } from "@/lib/push-server";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { enabled: pushConfigured(), publicKey: process.env.VAPID_PUBLIC_KEY ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

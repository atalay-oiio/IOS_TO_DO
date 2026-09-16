// Yayındaki sürümün kimliği; uygulama bunu kendi sürümüyle karşılaştırır.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev" },
    { headers: { "Cache-Control": "no-store" } }
  );
}

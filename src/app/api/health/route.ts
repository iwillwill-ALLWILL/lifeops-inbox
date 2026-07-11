export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { ok: true, service: "lifeops-inbox", parser: "deterministic-v1" },
    { headers: { "cache-control": "no-store" } },
  );
}

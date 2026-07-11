import { z } from "zod";
import { analyzeDocument } from "@/core/analyze";

export const dynamic = "force-dynamic";

const AnalyzeRequestSchema = z
  .object({
    text: z.string().trim().min(1).max(100_000),
    referenceDate: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

const error = () =>
  Response.json(
    { error: "Send 1–100,000 characters in the text field only. File bytes are not accepted." },
    { status: 400, headers: { "cache-control": "no-store" } },
  );

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error();
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) return error();

  const analysis = analyzeDocument(parsed.data.text, {
    referenceDate: parsed.data.referenceDate
      ? new Date(parsed.data.referenceDate)
      : undefined,
  });

  return Response.json(
    { analysis },
    { headers: { "cache-control": "no-store" } },
  );
}

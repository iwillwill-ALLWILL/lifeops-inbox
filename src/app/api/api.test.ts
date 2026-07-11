import { describe, expect, it } from "vitest";
import { GET as health } from "./health/route";
import { POST as analyze } from "./analyze/route";

describe("API route handlers", () => {
  it("reports a small, cache-free health response", async () => {
    const response = await health();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      service: "lifeops-inbox",
      parser: "deterministic-v1",
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("analyzes opt-in text with the same deterministic core", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: "Amount due: $42.00\nDue date: July 14, 2026",
        referenceDate: "2026-07-11T12:00:00Z",
      }),
    });

    const response = await analyze(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.analysis.facts).toEqual(
      expect.arrayContaining([expect.objectContaining({ normalizedValue: "USD 42.00" })]),
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects malformed bodies and file-like payloads without echoing private data", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "", file: "base64-secret" }),
    });

    const response = await analyze(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "Send 1–100,000 characters in the text field only. File bytes are not accepted.",
    });
    expect(JSON.stringify(payload)).not.toContain("base64-secret");
  });

  it("returns a structured 400 for whitespace-only text", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: " \n\t " }),
    });

    const response = await analyze(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Send 1–100,000 characters in the text field only. File bytes are not accepted.",
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});

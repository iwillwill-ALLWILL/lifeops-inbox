import { describe, expect, it } from "vitest";
import { analyzeDocument } from "./analyze";
import { DEMO_SAMPLES } from "./samples";

describe("built-in demo samples", () => {
  it("ships exactly three clearly labeled, realistic scenarios", () => {
    expect(DEMO_SAMPLES).toHaveLength(3);
    expect(DEMO_SAMPLES.map((sample) => sample.id)).toEqual([
      "renewal-bill",
      "travel-itinerary",
      "official-notice",
    ]);
    expect(DEMO_SAMPLES.every((sample) => sample.badge === "Built-in sample")).toBe(true);
  });

  it("labels the hackathon scenario as a demo memo and uses the verified public deadline", () => {
    const sample = DEMO_SAMPLES.find((item) => item.id === "official-notice")!;

    expect(sample.text).toContain("DEMO PARTICIPANT ACTION MEMO");
    expect(sample.text).toContain("July 17, 2026, 23:59 UTC");
    expect(sample.text).not.toContain("OFFICIAL PARTICIPANT NOTICE");
  });

  it.each([
    ["renewal-bill", "bill", 2, 0],
    ["travel-itinerary", "travel", 3, 0],
    ["official-notice", "notice", 3, 1],
  ] as const)(
    "%s produces useful actions and expected exceptions through the real parser",
    (id, kind, minimumActions, conflicts) => {
      const sample = DEMO_SAMPLES.find((item) => item.id === id)!;
      const result = analyzeDocument(sample.text, {
        referenceDate: new Date("2026-07-11T12:00:00Z"),
      });

      expect(result.documentKind).toBe(kind);
      expect(result.actions.length).toBeGreaterThanOrEqual(minimumActions);
      expect(result.conflicts).toHaveLength(conflicts);
      expect(result.facts.length).toBeGreaterThanOrEqual(4);
    },
  );
});

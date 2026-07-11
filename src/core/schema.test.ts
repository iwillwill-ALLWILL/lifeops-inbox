import { describe, expect, it } from "vitest";
import { ActionSchema, AnalysisSchema, FactSchema } from "./schema";

const source = "Payment due July 12, 2026. Total: $84.20";

function validAnalysis() {
  const quote = "$84.20";
  const start = source.indexOf(quote);
  return {
    version: "1.0" as const,
    sourceText: source,
    title: "Payment notice",
    documentKind: "bill" as const,
    confidence: 0.92,
    facts: [
      {
        id: "fact-1",
        kind: "amount" as const,
        label: "Amount due",
        value: quote,
        normalizedValue: "USD 84.20",
        confidence: 0.97,
        evidence: { quote, start, end: start + quote.length },
      },
    ],
    actions: [],
    uncertainties: [],
    conflicts: [],
  };
}

describe("AnalysisSchema", () => {
  it("preserves explicit date-only semantics on facts and actions", () => {
    const fact = FactSchema.parse({
      id: "fact-1",
      kind: "date",
      label: "Due date",
      value: "July 12, 2026",
      confidence: 0.9,
      evidence: { quote: "July 12, 2026", start: 12, end: 25 },
      date: {
        iso: "2026-07-12",
        dateOnly: true,
        hasExplicitYear: true,
        hasExplicitTime: false,
        hasExplicitTimezone: false,
      },
    });
    const action = ActionSchema.parse({
      id: "action-1",
      title: "Pay invoice",
      lane: "this-week",
      dueAt: "2026-07-12",
      dateOnly: true,
      sourceFactIds: ["fact-1"],
    });

    expect(fact.date?.dateOnly).toBe(true);
    expect(action.dateOnly).toBe(true);
  });

  it("preserves fixed-offset metadata for an explicit timezone abbreviation", () => {
    const fact = FactSchema.parse({
      id: "fact-1",
      kind: "date",
      label: "Departure",
      value: "Aug 18, 2026 at 10:30 PM PST",
      confidence: 0.96,
      evidence: { quote: "Aug 18, 2026 at 10:30 PM PST", start: 0, end: 32 },
      date: {
        iso: "2026-08-18T22:30:00-08:00",
        dateOnly: false,
        timezone: "Etc/GMT+8",
        timezoneAbbreviation: "PST",
        utcOffset: "-08:00",
        hasExplicitYear: true,
        hasExplicitTime: true,
        hasExplicitTimezone: true,
      },
    });

    expect(fact.date).toMatchObject({
      timezone: "Etc/GMT+8",
      timezoneAbbreviation: "PST",
      utcOffset: "-08:00",
    });
  });

  it("accepts an analysis whose evidence exactly matches the source", () => {
    expect(AnalysisSchema.parse(validAnalysis()).facts).toHaveLength(1);
  });

  it("rejects confidence outside the zero-to-one range", () => {
    const analysis = validAnalysis();
    analysis.confidence = 1.2;

    expect(AnalysisSchema.safeParse(analysis).success).toBe(false);
  });

  it("rejects evidence offsets that do not resolve to the verbatim quote", () => {
    const analysis = validAnalysis();
    analysis.facts[0].evidence.start = 0;

    const result = AnalysisSchema.safeParse(analysis);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Evidence quote");
    }
  });
});

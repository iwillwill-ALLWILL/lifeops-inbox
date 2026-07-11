import { describe, expect, it } from "vitest";
import { detectConflicts } from "./conflicts";
import type { Fact } from "./schema";

const dateFact = (id: string, label: string, iso: string): Fact => ({
  id,
  kind: "date",
  label,
  value: iso,
  normalizedValue: iso,
  confidence: 0.95,
  evidence: { quote: iso, start: 0, end: iso.length },
  date: {
    iso,
    dateOnly: false,
    hasExplicitYear: true,
    hasExplicitTime: true,
    hasExplicitTimezone: true,
    timezone: "UTC",
  },
});

describe("detectConflicts", () => {
  it("links distinct submission deadlines into one actionable conflict", () => {
    const conflicts = detectConflicts([
      dateFact("fact-1", "Project submission deadline", "2026-08-05T23:59:00+00:00"),
      dateFact("fact-2", "Submission portal closes", "2026-08-04T23:59:00+00:00"),
    ]);

    expect(conflicts).toEqual([
      expect.objectContaining({
        severity: "conflict",
        factIds: ["fact-1", "fact-2"],
      }),
    ]);
  });

  it("does not conflate draft and final submission milestones", () => {
    expect(
      detectConflicts([
        dateFact("fact-1", "Draft submission deadline", "2026-08-01T17:00:00+00:00"),
        dateFact("fact-2", "Final submission deadline", "2026-08-05T17:00:00+00:00"),
      ]),
    ).toEqual([]);
  });

  it("does not report a conflict when duplicate notices resolve to the same instant", () => {
    expect(
      detectConflicts([
        dateFact("fact-1", "Project submission deadline", "2026-08-05T23:59:00+00:00"),
        dateFact("fact-2", "Submission portal closes", "2026-08-05T23:59:00+00:00"),
      ]),
    ).toEqual([]);
  });
});

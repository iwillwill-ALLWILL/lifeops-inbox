import { describe, expect, it } from "vitest";
import type { Evidence, Fact } from "@/core/schema";
import { confidenceMeta, createShareCardSvg, formatDueAt, formatFactValue, segmentSource } from "./presentation";

describe("segmentSource", () => {
  it("returns before, exact highlight, and after segments for a selected citation", () => {
    const source = "Amount due: $84.20 by Friday";
    const evidence: Evidence = { quote: "$84.20", start: 12, end: 18 };

    expect(segmentSource(source, evidence)).toEqual([
      { text: "Amount due: ", highlighted: false },
      { text: "$84.20", highlighted: true },
      { text: " by Friday", highlighted: false },
    ]);
  });

  it("returns one unhighlighted segment when there is no selection", () => {
    expect(segmentSource("Plain source")).toEqual([
      { text: "Plain source", highlighted: false },
    ]);
  });
});

describe("confidenceMeta", () => {
  it.each([
    [0.9, "High"],
    [0.7, "Review"],
    [0.4, "Low"],
  ] as const)("maps %s to %s confidence", (score, label) => {
    expect(confidenceMeta(score).label).toBe(label);
  });
});

describe("formatDueAt", () => {
  it("renders an action in the timezone stated by its source fact", () => {
    expect(formatDueAt("2026-08-18T22:30:00-07:00", "America/Los_Angeles")).toBe(
      "Aug 18, 10:30 PM PDT",
    );
  });

  it("renders a date-only action without shifting the calendar day", () => {
    expect(formatDueAt("2026-07-14", undefined, true)).toBe("Jul 14, 2026");
  });

  it("renders a PST action at the source-stated wall time", () => {
    expect(
      formatDueAt("2026-08-18T22:30:00-08:00", "Etc/GMT+8", false, "PST"),
    ).toBe("Aug 18, 10:30 PM PST");
  });
});

describe("formatFactValue", () => {
  it("renders normalized dates for humans instead of exposing raw ISO strings", () => {
    const fact: Fact = {
      id: "fact-1",
      kind: "date",
      label: "Submission deadline",
      value: "July 17, 2026, 23:59 UTC",
      normalizedValue: "2026-07-17T23:59:00+00:00",
      confidence: 0.96,
      evidence: { quote: "July 17, 2026, 23:59 UTC", start: 0, end: 27 },
      date: {
        iso: "2026-07-17T23:59:00+00:00",
        dateOnly: false,
        timezone: "UTC",
        hasExplicitYear: true,
        hasExplicitTime: true,
        hasExplicitTimezone: true,
      },
    };

    expect(formatFactValue(fact)).toBe("Jul 17, 2026, 11:59 PM UTC");
  });

  it("renders a date-only fact as the stated calendar date", () => {
    const fact: Fact = {
      id: "fact-1",
      kind: "date",
      label: "Due date",
      value: "July 14, 2026",
      normalizedValue: "2026-07-14",
      confidence: 0.96,
      evidence: { quote: "July 14, 2026", start: 0, end: 13 },
      date: {
        iso: "2026-07-14",
        dateOnly: true,
        hasExplicitYear: true,
        hasExplicitTime: false,
        hasExplicitTimezone: false,
      },
    };

    expect(formatFactValue(fact)).toBe("Jul 14, 2026");
  });

  it("renders a PST fact at the source-stated wall time", () => {
    const fact: Fact = {
      id: "fact-1",
      kind: "date",
      label: "Departure",
      value: "Aug 18, 2026 at 10:30 PM PST",
      normalizedValue: "2026-08-18T22:30:00-08:00",
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
    };

    expect(formatFactValue(fact)).toBe("Aug 18, 2026, 10:30 PM PST");
  });

  it("keeps a timezone-less wall time as source text instead of converting it", () => {
    const fact: Fact = {
      id: "fact-1",
      kind: "date",
      label: "Workshop deadline",
      value: "July 14, 2026 at 3 PM",
      normalizedValue: "2026-07-14T15:00:00",
      confidence: 0.72,
      evidence: { quote: "July 14, 2026 at 3 PM", start: 0, end: 24 },
      date: {
        iso: "2026-07-14T15:00:00",
        dateOnly: false,
        hasExplicitYear: true,
        hasExplicitTime: true,
        hasExplicitTimezone: false,
      },
    };

    expect(formatFactValue(fact)).toBe("July 14, 2026 at 3 PM");
  });
});

describe("createShareCardSvg", () => {
  it("renders a before/after card without source text, evidence, or unsafe markup", () => {
    const svg = createShareCardSvg({
      title: "Trip <script>alert(1)</script>",
      documentKind: "travel",
      confidence: 0.91,
      counts: { facts: 6, actions: 3, exceptions: 1 },
      actions: [{ title: "Check in & pack", lane: "waiting", dueAt: "2026-08-18" }],
      exceptions: [],
      privacyNote: "Source excluded.",
    });

    expect(svg).toContain("Before");
    expect(svg).toContain("After");
    expect(svg).toContain("3 next actions");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("evidence");
  });
});

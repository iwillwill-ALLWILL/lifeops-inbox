import { describe, expect, it } from "vitest";
import { createIcs } from "./ics";
import type { Analysis } from "./schema";

function analysisFixture(): Analysis {
  const sourceText = "Departure: Aug 18, 2026 at 10:30 PM PST";
  return {
    version: "1.0",
    sourceText,
    title: "Trip, Singapore",
    documentKind: "travel",
    confidence: 0.96,
    facts: [
      {
        id: "fact-1",
        kind: "date",
        label: "Departure",
        value: "Aug 18, 2026 at 10:30 PM PST",
        normalizedValue: "2026-08-18T22:30:00-08:00",
        confidence: 0.96,
        evidence: { quote: sourceText.slice(11), start: 11, end: sourceText.length },
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
      },
    ],
    actions: [
      {
        id: "action-1",
        title: "Prepare, pack; check passport",
        lane: "waiting",
        status: "open",
        dueAt: "2026-08-18T22:30:00-08:00",
        dateOnly: false,
        sourceFactIds: ["fact-1"],
      },
    ],
    uncertainties: [],
    conflicts: [],
  };
}

describe("createIcs", () => {
  it("creates a standards-shaped calendar with fixed source timezone, escaped text, and provenance", () => {
    const calendar = createIcs(analysisFixture(), {
      generatedAt: new Date("2026-07-11T12:00:00Z"),
    });

    expect(calendar).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(calendar).toContain("TZID:LifeOps/PST");
    expect(calendar).toContain("TZOFFSETTO:-0800");
    expect(calendar).toContain("DTSTART;TZID=LifeOps/PST:20260818T223000");
    expect(calendar).toContain("SUMMARY:Prepare\\, pack\\; check passport");
    expect(calendar).toContain("Derived from: Aug 18\\, 2026 at 10:30 PM PST");
    expect(calendar).toMatch(/UID:[a-z0-9]+-action-1@lifeops\.local/);
    expect(calendar.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("omits actions with no usable date and deduplicates identical events", () => {
    const analysis = analysisFixture();
    analysis.actions.push(
      { ...analysis.actions[0], id: "action-2" },
      {
        id: "action-3",
        title: "Confirm transfer",
        lane: "waiting",
        status: "open",
        dateOnly: false,
        sourceFactIds: ["fact-1"],
      },
    );

    const calendar = createIcs(analysis, {
      generatedAt: new Date("2026-07-11T12:00:00Z"),
    });

    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(calendar).not.toContain("Confirm transfer");
  });

  it("exports date-only actions as all-day values without timezone conversion", () => {
    const analysis = analysisFixture();
    analysis.actions = [{
      ...analysis.actions[0],
      dueAt: "2026-07-14",
      dateOnly: true,
    }];

    const calendar = createIcs(analysis, {
      generatedAt: new Date("2026-07-11T12:00:00Z"),
    });

    expect(calendar).toContain("DTSTART;VALUE=DATE:20260714");
    expect(calendar).not.toContain("DTSTART:20260714T000000Z");
  });

  it("uses UIDs that are stable for one analysis and unique across documents", () => {
    const first = analysisFixture();
    const second = analysisFixture();
    second.sourceText = `Different document: ${second.sourceText}`;
    second.title = "Different trip";

    const firstUid = createIcs(first).match(/UID:([^\r\n]+)/)?.[1];
    const repeatedUid = createIcs(first).match(/UID:([^\r\n]+)/)?.[1];
    const secondUid = createIcs(second).match(/UID:([^\r\n]+)/)?.[1];

    expect(firstUid).toBeDefined();
    expect(repeatedUid).toBe(firstUid);
    expect(secondUid).not.toBe(firstUid);
  });

  it("folds every content line to 75 UTF-8 octets with continuation spaces", () => {
    const analysis = analysisFixture();
    const title = "准备护照和旅行文件".repeat(12);
    analysis.actions[0].title = title;

    const calendar = createIcs(analysis, {
      generatedAt: new Date("2026-07-11T12:00:00Z"),
    });
    const physicalLines = calendar.split("\r\n").filter(Boolean);
    const unfolded = physicalLines.reduce<string[]>((lines, line) => {
      if (line.startsWith(" ")) lines[lines.length - 1] += line.slice(1);
      else lines.push(line);
      return lines;
    }, []);

    expect(physicalLines.some((line) => line.startsWith(" "))).toBe(true);
    expect(physicalLines.every((line) => Buffer.byteLength(line, "utf8") <= 75)).toBe(true);
    expect(calendar).not.toContain("�");
    expect(unfolded).toContain(`SUMMARY:${title}`);
  });
});

import ICAL from "ical.js";
import { describe, expect, it } from "vitest";
import { createIcs } from "./ics";
import type { Analysis } from "./schema";

function fixture(dateOnly = false): Analysis {
  const quote = dateOnly ? "July 14, 2026" : "Aug 18, 2026 at 10:30 PM PST";
  const sourceText = `Deadline: ${quote}`;
  const dueAt = dateOnly ? "2026-07-14" : "2026-08-18T22:30:00-08:00";
  return {
    version: "1.0",
    sourceText,
    title: "LifeOps validation",
    documentKind: "notice",
    confidence: 0.98,
    facts: [{
      id: "fact-1",
      kind: "date",
      label: "Deadline",
      value: quote,
      normalizedValue: dueAt,
      confidence: 0.98,
      evidence: { quote, start: 10, end: sourceText.length },
      date: {
        iso: dueAt,
        dateOnly,
        timezone: dateOnly ? undefined : "Etc/GMT+8",
        timezoneAbbreviation: dateOnly ? undefined : "PST",
        utcOffset: dateOnly ? undefined : "-08:00",
        hasExplicitYear: true,
        hasExplicitTime: !dateOnly,
        hasExplicitTimezone: !dateOnly,
      },
    }],
    actions: [{
      id: "action-1",
      title: "Complete filing",
      lane: "this-week",
      status: "open",
      dueAt,
      dateOnly,
      sourceFactIds: ["fact-1"],
    }],
    uncertainties: [],
    conflicts: [],
  };
}

function parseCalendar(analysis: Analysis) {
  const source = createIcs(analysis, { generatedAt: new Date("2026-07-11T12:00:00Z") });
  return new ICAL.Component(ICAL.parse(source));
}

describe("RFC 5545 interoperability", () => {
  it("is accepted by ICAL.js with the expected event and fixed source timezone", () => {
    const calendar = parseCalendar(fixture());
    const events = calendar.getAllSubcomponents("vevent");
    const timezones = calendar.getAllSubcomponents("vtimezone");
    const event = new ICAL.Event(events[0]);

    expect(events).toHaveLength(1);
    expect(timezones).toHaveLength(1);
    expect(event.summary).toBe("Complete filing");
    expect(event.startDate.zone.tzid).toBe("LifeOps/PST");
    expect(event.startDate.toString()).toBe("2026-08-18T22:30:00");
    expect(event.description).toContain("Aug 18, 2026 at 10:30 PM PST");
  });

  it("round-trips date-only actions as all-day events", () => {
    const calendar = parseCalendar(fixture(true));
    const event = new ICAL.Event(calendar.getFirstSubcomponent("vevent")!);

    expect(event.startDate.isDate).toBe(true);
    expect(event.startDate.toString()).toBe("2026-07-14");
  });
});

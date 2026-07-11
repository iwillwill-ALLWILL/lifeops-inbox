import * as chrono from "chrono-node";
import { detectConflicts } from "./conflicts";
import { AnalysisSchema, type Action, type Analysis, type Fact, type Uncertainty } from "./schema";

export type AnalyzeOptions = {
  referenceDate?: Date;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const TIMEZONES: Record<string, { name: string; offset: string }> = {
  UTC: { name: "UTC", offset: "+00:00" },
  GMT: { name: "UTC", offset: "+00:00" },
  PDT: { name: "Etc/GMT+7", offset: "-07:00" },
  PST: { name: "Etc/GMT+8", offset: "-08:00" },
  SGT: { name: "Etc/GMT-8", offset: "+08:00" },
  EDT: { name: "Etc/GMT+4", offset: "-04:00" },
  EST: { name: "Etc/GMT+5", offset: "-05:00" },
  CDT: { name: "Etc/GMT+5", offset: "-05:00" },
  CST: { name: "Etc/GMT+6", offset: "-06:00" },
};

const pad = (value: number) => String(value).padStart(2, "0");

function linesWithOffsets(sourceText: string) {
  let cursor = 0;
  return sourceText.split(/\n/).map((text) => {
    const line = { text, start: cursor };
    cursor += text.length + 1;
    return line;
  });
}

function classifyDocument(text: string): Analysis["documentKind"] {
  if (/flight|departs|arrives|hotel|booking reference/i.test(text)) return "travel";
  if (/amount due|invoice|billing|autopay|overdue/i.test(text)) return "bill";
  if (/hackathon|official.+notice|submission deadline/i.test(text)) return "notice";
  if (/medical|appointment|clinic|prescription/i.test(text)) return "medical";
  if (/school|class|student|teacher/i.test(text)) return "school";
  if (/work|office|employee|manager/i.test(text)) return "work";
  if (/event|workshop|meet(?:ing)?|demo day/i.test(text)) return "event";
  return "unknown";
}

function labelForDate(line: string) {
  const prefix = line.split(/(?:\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2}[/-]\d{1,2}))/i)[0] ?? "Date";
  const cleaned = prefix
    .replace(/^\s*(?:reminder\s*[—–-]?\s*)/i, "")
    .replace(/[\s:—–-]+$/, "")
    .trim();
  if (/original due/i.test(cleaned)) return "Original due date";
  if (/due date/i.test(cleaned)) return "Due date";
  if (/service renewal/i.test(cleaned)) return "Service renewal";
  if (/depart/i.test(cleaned)) return "Departure";
  if (/arriv/i.test(cleaned)) return "Arrival";
  if (/check-in/i.test(cleaned)) return "Hotel check-in";
  if (/check-out/i.test(cleaned)) return "Hotel check-out";
  if (/registration deadline/i.test(cleaned)) return "Registration deadline";
  if (/project submission deadline/i.test(cleaned)) return "Project submission deadline";
  if (/submission portal closes/i.test(cleaned)) return "Submission portal closes";
  if (/demo day/i.test(cleaned)) return "Demo day";
  if (/workshop deadline/i.test(cleaned)) return "Workshop deadline";
  if (/deadline/i.test(cleaned)) return cleaned || "Deadline";
  if (/sync/i.test(cleaned)) return "Team sync";
  return cleaned || "Date";
}

function toDateParts(result: chrono.ParsedResult): DateParts {
  const start = result.start;
  return {
    year: start.get("year") ?? start.date().getFullYear(),
    month: start.get("month") ?? start.date().getMonth() + 1,
    day: start.get("day") ?? start.date().getDate(),
    hour: start.isCertain("hour") ? (start.get("hour") ?? 0) : 0,
    minute: start.isCertain("minute") ? (start.get("minute") ?? 0) : 0,
  };
}

function formatIso(parts: DateParts, offset?: string) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:00${offset ?? ""}`;
}

function formatDateOnly(parts: DateParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function factId(index: number) {
  return `fact-${index + 1}`;
}

function daysFrom(reference: Date, iso: string) {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return Number.POSITIVE_INFINITY;
  return (timestamp - reference.getTime()) / 86_400_000;
}

export function analyzeDocument(sourceText: string, options: AnalyzeOptions = {}): Analysis {
  const text = sourceText.trim();
  if (!text) throw new Error("Document text is required");

  const referenceDate = options.referenceDate ?? new Date();
  const facts: Fact[] = [];
  const uncertainties: Uncertainty[] = [];
  const lines = linesWithOffsets(text);

  const addFact = (fact: Omit<Fact, "id">) => {
    const item: Fact = { ...fact, id: factId(facts.length) };
    facts.push(item);
    return item;
  };

  for (const line of lines) {
    const location = line.text.match(/^(Departs|Arrives):\s*([^—–\n]+?\(([A-Z]{3})\))\s*[—–-]/i);
    if (location && location.index !== undefined) {
      const value = location[2].trim();
      const startInLine = line.text.indexOf(value, location.index);
      const city = value.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim();
      const start = line.start + startInLine;
      addFact({
        kind: "location",
        label: /^departs/i.test(location[1]) ? "Origin" : "Destination",
        value,
        normalizedValue: `${location[3].toUpperCase()} · ${city}`,
        confidence: 0.98,
        evidence: { quote: value, start, end: start + value.length },
      });
    }

    const reference = line.text.match(/^(Booking reference|Hotel confirmation|Account|Order ID)\s*:\s*([^\n]+)$/i);
    if (reference) {
      const value = reference[2].trim();
      const startInLine = line.text.lastIndexOf(value);
      const start = line.start + startInLine;
      addFact({
        kind: "reference",
        label: reference[1],
        value,
        confidence: 0.98,
        evidence: { quote: value, start, end: start + value.length },
      });
    }

    const amountMatches = line.text.matchAll(/[$€£]\s*[0-9OBIl|]+(?:[0-9OBIl|,\s]*[0-9OBIl|])?(?:\.[0-9OBIl|]{2})?/g);
    for (const match of amountMatches) {
      const raw = match[0];
      const repaired = raw
        .replace(/[\s,]/g, "")
        .replace(/[OB]/g, (character) => (character === "O" ? "0" : "8"))
        .replace(/[Il|]/g, "1");
      const currency = raw.trim().charAt(0);
      const numeric = Number.parseFloat(repaired.slice(1));
      if (!Number.isFinite(numeric)) continue;
      const wasRepaired = /[OBIl|]/.test(raw);
      const start = line.start + (match.index ?? 0);
      const amountFact = addFact({
        kind: "amount",
        label: /amount due|invoice total/i.test(line.text) ? "Amount due" : "Amount",
        value: raw,
        normalizedValue: `${currency === "$" ? "USD" : currency === "€" ? "EUR" : "GBP"} ${numeric.toFixed(2)}`,
        confidence: wasRepaired ? 0.78 : 0.97,
        evidence: { quote: raw, start, end: start + raw.length },
      });
      if (wasRepaired) {
        uncertainties.push({
          id: `uncertainty-${uncertainties.length + 1}`,
          message: "OCR-like characters were conservatively repaired in a money value; verify the highlighted source.",
          severity: "warning",
          factIds: [amountFact.id],
        });
      }
    }

    const status = line.text.match(/\b(OVERDUE|PAST DUE|PAID|PENDING|CANCELLED)\b/i);
    if (status && status.index !== undefined) {
      const start = line.start + status.index;
      addFact({
        kind: "status",
        label: /\b(?:previous|prior|last)\b/i.test(line.text) ? "Previous status" : "Status",
        value: status[0],
        normalizedValue: status[0].toLowerCase().replace(/\s+/g, "-"),
        confidence: 0.99,
        evidence: { quote: status[0], start, end: start + status[0].length },
      });
    }

    const normalizedLine = line.text.replace(/Ju1y/gi, "July");
    const parsedDates = chrono.parse(normalizedLine, referenceDate, { forwardDate: true });
    for (const parsed of parsedDates) {
      if (!/\b(?:20\d{2}|\d{1,2}[/-]\d{1,2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(parsed.text)) continue;
      const quote = line.text.slice(parsed.index, parsed.index + parsed.text.length);
      const segmentStart = normalizedLine.lastIndexOf(";", parsed.index - 1) + 1;
      const nextSeparator = normalizedLine.indexOf(";", parsed.index + parsed.text.length);
      const segmentEnd = nextSeparator === -1 ? normalizedLine.length : nextSeparator;
      const localContext = line.text.slice(segmentStart, segmentEnd).trim();
      const label = labelForDate(localContext);
      const parts = toDateParts(parsed);
      const zoneMatch = parsed.text.match(/\b(UTC|GMT|PDT|PST|SGT|EDT|EST|CDT|CST)\b/i)
        ?? localContext.match(/\b(UTC|GMT|PDT|PST|SGT|EDT|EST|CDT|CST)\b/i);
      const timezoneAbbreviation = zoneMatch?.[1].toUpperCase();
      const timezone = timezoneAbbreviation ? TIMEZONES[timezoneAbbreviation] : undefined;
      const hasExplicitYear = /\b(?:19|20)\d{2}\b/.test(parsed.text);
      const hasExplicitTime = parsed.start.isCertain("hour");
      const hasExplicitTimezone = Boolean(timezone);
      const dateOnly = !hasExplicitTime;
      const iso = dateOnly ? formatDateOnly(parts) : formatIso(parts, timezone?.offset);
      const duplicate = facts.some(
        (fact) => fact.kind === "date" && fact.label === label && fact.date?.iso === iso,
      );
      if (duplicate) continue;

      const start = line.start + parsed.index;
      const dateFact = addFact({
        kind: "date",
        label,
        value: quote,
        normalizedValue: iso,
        confidence: hasExplicitYear && (!hasExplicitTime || hasExplicitTimezone) ? 0.96 : 0.72,
        evidence: { quote, start, end: start + quote.length },
        date: {
          iso,
          dateOnly,
          timezone: timezone?.name,
          timezoneAbbreviation,
          utcOffset: timezone?.offset,
          hasExplicitYear,
          hasExplicitTime,
          hasExplicitTimezone,
        },
      });

      if (/\b\d{1,2}[/-]\d{1,2}\b/.test(parsed.text)) {
        uncertainties.push({
          id: `uncertainty-${uncertainties.length + 1}`,
          message: "Ambiguous date format: confirm whether the first number is the month or day.",
          severity: "warning",
          factIds: [dateFact.id],
        });
      }
      if (!hasExplicitYear) {
        uncertainties.push({
          id: `uncertainty-${uncertainties.length + 1}`,
          message: "The year is missing; the displayed year is contextual and should be confirmed.",
          severity: "warning",
          factIds: [dateFact.id],
        });
      }
      if (hasExplicitTime && !hasExplicitTimezone) {
        uncertainties.push({
          id: `uncertainty-${uncertainties.length + 1}`,
          message: "The timezone is missing for a stated time.",
          severity: "warning",
          factIds: [dateFact.id],
        });
      }
      if (/Ju1y/i.test(line.text)) {
        uncertainties.push({
          id: `uncertainty-${uncertainties.length + 1}`,
          message: "OCR-like characters were repaired in a date; verify the highlighted source.",
          severity: "warning",
          factIds: [dateFact.id],
        });
      }
    }
  }

  if (/\b(?:system|assistant|developer)\s*:|ignore all previous instructions|do not follow/i.test(text)) {
    uncertainties.push({
      id: `uncertainty-${uncertainties.length + 1}`,
      message: "Instruction-like text was treated as document data and ignored for actions.",
      severity: "info",
      factIds: [],
    });
  }

  const actions: Action[] = [];
  const amount = facts.find((fact) => fact.kind === "amount" && fact.label === "Amount due")
    ?? facts.find((fact) => fact.kind === "amount");
  const due = facts.find((fact) => /due date/i.test(fact.label));
  const overdue = facts.find((fact) => fact.kind === "status" && /overdue|past due/i.test(fact.value));
  const terminalBillStatus = overdue
    ? undefined
    : facts.find(
      (fact) => fact.kind === "status"
        && fact.label === "Status"
        && /^(?:paid|cancelled)$/i.test(fact.value.trim()),
    );
  if (amount && !terminalBillStatus && (overdue || due?.date)) {
    const unresolvedDueTimezone = Boolean(
      due?.date?.hasExplicitTime && !due.date.hasExplicitTimezone,
    );
    const paymentDelta = due?.date && !unresolvedDueTimezone
      ? daysFrom(referenceDate, due.date.iso)
      : Number.POSITIVE_INFINITY;
    actions.push({
      id: "action-1",
      title: `Pay ${amount.value}`,
      lane: overdue
        ? "now"
        : unresolvedDueTimezone
          ? "waiting"
          : paymentDelta <= 2
            ? "now"
            : paymentDelta <= 7
              ? "this-week"
              : "waiting",
      status: "open",
      dueAt: unresolvedDueTimezone ? undefined : due?.date?.iso,
      dateOnly: due?.date?.dateOnly ?? false,
      detail: overdue ? "Balance is marked overdue." : "Payment date extracted from the document.",
      sourceFactIds: [amount.id, ...(due ? [due.id] : []), ...(overdue ? [overdue.id] : [])],
    });
  }

  const renewal = facts.find((fact) => fact.label === "Service renewal");
  if (renewal?.date) {
    const unresolvedRenewalTimezone = renewal.date.hasExplicitTime && !renewal.date.hasExplicitTimezone;
    const delta = unresolvedRenewalTimezone
      ? Number.POSITIVE_INFINITY
      : daysFrom(referenceDate, renewal.date.iso);
    actions.push({
      id: `action-${actions.length + 1}`,
      title: "Review service renewal",
      lane: unresolvedRenewalTimezone
        ? "waiting"
        : delta <= 0
          ? "now"
          : delta <= 7
            ? "this-week"
            : "waiting",
      status: "open",
      dueAt: unresolvedRenewalTimezone ? undefined : renewal.date.iso,
      dateOnly: renewal.date.dateOnly,
      detail: "Confirm service and payment status before renewal.",
      sourceFactIds: [renewal.id],
    });
  }

  for (const fact of facts.filter((item) => item.kind === "date" && /deadline|portal closes|departure|check-in|demo day/i.test(item.label))) {
    if (!fact.date || renewal?.id === fact.id) continue;
    const unresolvedTimezone = fact.date.hasExplicitTime && !fact.date.hasExplicitTimezone;
    const delta = unresolvedTimezone
      ? Number.POSITIVE_INFINITY
      : daysFrom(referenceDate, fact.date.iso);
    const lane: Action["lane"] = unresolvedTimezone
      ? "waiting"
      : delta <= 2
        ? "now"
        : delta <= 7
          ? "this-week"
          : "waiting";
    const verb = fact.label === "Departure" ? "Prepare for departure" : fact.label === "Hotel check-in" ? "Check in to hotel" : `Complete ${fact.label.toLowerCase()}`;
    actions.push({
      id: `action-${actions.length + 1}`,
      title: verb,
      lane,
      status: "open",
      dueAt: unresolvedTimezone ? undefined : fact.date.iso,
      dateOnly: fact.date.dateOnly,
      sourceFactIds: [fact.id],
    });
  }

  const departure = facts.find((fact) => fact.label === "Departure" && fact.date);
  if (
    departure?.date
    && departure.date.hasExplicitTimezone
    && /online check-in opens\s+24 hours before departure/i.test(text)
  ) {
    const opensAt = new Date(Date.parse(departure.date.iso) - 86_400_000).toISOString();
    actions.push({
      id: `action-${actions.length + 1}`,
      title: "Check in online",
      lane: daysFrom(referenceDate, opensAt) <= 2
        ? "now"
        : daysFrom(referenceDate, opensAt) <= 7
          ? "this-week"
          : "waiting",
      status: "open",
      dueAt: opensAt,
      dateOnly: false,
      detail: "Online check-in opens 24 hours before departure.",
      sourceFactIds: [departure.id],
    });
  }

  const conflicts = detectConflicts(facts);

  if (!facts.length) {
    uncertainties.push({
      id: `uncertainty-${uncertainties.length + 1}`,
      message: "No supported facts were recognized. Review the source or provide a clearer life-admin document.",
      severity: "warning",
      factIds: [],
    });
  }

  const confidence = facts.length
    ? Number((facts.reduce((sum, fact) => sum + fact.confidence, 0) / facts.length).toFixed(2))
    : 0.35;

  return AnalysisSchema.parse({
    version: "1.0",
    sourceText: text,
    title: lines.find((line) => line.text.trim())?.text.trim().slice(0, 90) ?? "Document",
    documentKind: classifyDocument(text),
    confidence,
    facts,
    actions,
    uncertainties,
    conflicts,
  });
}

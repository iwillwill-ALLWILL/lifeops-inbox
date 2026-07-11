import type { Analysis } from "./schema";

type IcsOptions = {
  generatedAt?: Date;
};

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatUtc(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function formatAtOffset(date: Date, offset: string) {
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const direction = match[1] === "+" ? 1 : -1;
  const minutes = direction * (Number(match[2]) * 60 + Number(match[3]));
  return formatUtc(new Date(date.getTime() + minutes * 60_000)).replace(/Z$/, "");
}

function formatIcsOffset(offset: string) {
  return offset.replace(":", "");
}

function analysisKey(analysis: Analysis) {
  let hash = 14_695_981_039_346_656_037n;
  for (const character of analysis.sourceText) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 1_099_511_628_211n);
  }
  return hash.toString(36);
}

function foldLine(line: string) {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let chunk = "";
  let limit = 75;

  for (const character of line) {
    if (chunk && encoder.encode(chunk + character).length > limit) {
      chunks.push(chunk);
      chunk = character;
      limit = 74;
    } else {
      chunk += character;
    }
  }
  if (chunk) chunks.push(chunk);

  return chunks.map((value, index) => (index === 0 ? value : ` ${value}`));
}

export function createIcs(analysis: Analysis, options: IcsOptions = {}) {
  const generatedAt = options.generatedAt ?? new Date();
  const uidNamespace = analysisKey(analysis);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LifeOps Inbox//Execution Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(analysis.title)}`,
  ];
  const seen = new Set<string>();
  const emittedTimezones = new Set<string>();

  for (const action of analysis.actions) {
    if (!action.dueAt) continue;
    const date = action.dateOnly ? undefined : new Date(action.dueAt);
    if (action.dateOnly && !/^\d{4}-\d{2}-\d{2}$/.test(action.dueAt)) continue;
    if (date && Number.isNaN(date.getTime())) continue;
    const key = `${action.title}|${action.dueAt}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const quotes = action.sourceFactIds
      .map((factId) => analysis.facts.find((fact) => fact.id === factId)?.evidence.quote)
      .filter((quote): quote is string => Boolean(quote));
    const description = quotes.length
      ? `Derived from: ${quotes.join(" | ")}`
      : "Derived by LifeOps Inbox from the supplied document.";
    const sourceDate = action.sourceFactIds
      .map((factId) => analysis.facts.find((fact) => fact.id === factId)?.date)
      .find((factDate) => factDate?.timezoneAbbreviation && factDate.utcOffset);
    const timezoneId = sourceDate
      ? `LifeOps/${sourceDate.timezoneAbbreviation}`
      : undefined;
    const localStart = date && sourceDate?.utcOffset
      ? formatAtOffset(date, sourceDate.utcOffset)
      : undefined;

    if (timezoneId && sourceDate?.utcOffset && !emittedTimezones.has(timezoneId)) {
      emittedTimezones.add(timezoneId);
      const offset = formatIcsOffset(sourceDate.utcOffset);
      lines.push(
        "BEGIN:VTIMEZONE",
        `TZID:${timezoneId}`,
        "BEGIN:STANDARD",
        "DTSTART:19700101T000000",
        `TZOFFSETFROM:${offset}`,
        `TZOFFSETTO:${offset}`,
        `TZNAME:${sourceDate.timezoneAbbreviation}`,
        "END:STANDARD",
        "END:VTIMEZONE",
      );
    }

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uidNamespace}-${action.id}@lifeops.local`,
      `DTSTAMP:${formatUtc(generatedAt)}`,
      action.dateOnly
        ? `DTSTART;VALUE=DATE:${action.dueAt.replace(/-/g, "")}`
        : timezoneId && localStart
          ? `DTSTART;TZID=${timezoneId}:${localStart}`
          : `DTSTART:${formatUtc(date!)}`,
      `SUMMARY:${escapeText(action.title)}`,
      `DESCRIPTION:${escapeText(description)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`;
}

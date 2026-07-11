import type { Evidence, Fact } from "@/core/schema";
import type { ShareSummary } from "@/core/redact";

export function segmentSource(source: string, evidence?: Evidence) {
  if (!evidence) return [{ text: source, highlighted: false }];
  return [
    { text: source.slice(0, evidence.start), highlighted: false },
    { text: source.slice(evidence.start, evidence.end), highlighted: true },
    { text: source.slice(evidence.end), highlighted: false },
  ].filter((segment) => segment.text.length > 0);
}

export function confidenceMeta(score: number) {
  if (score >= 0.85) return { label: "High", tone: "high" as const };
  if (score >= 0.6) return { label: "Review", tone: "review" as const };
  return { label: "Low", tone: "low" as const };
}

function formatDateOnly(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatDueAt(
  iso: string,
  timezone = "UTC",
  dateOnly = false,
  timezoneAbbreviation?: string,
) {
  if (dateOnly) return formatDateOnly(iso);
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: timezoneAbbreviation ? undefined : "short",
  }).format(new Date(iso));
  return timezoneAbbreviation ? `${formatted} ${timezoneAbbreviation}` : formatted;
}

export function formatFactValue(fact: Fact) {
  if (fact.kind === "date" && fact.date?.iso) {
    if (fact.date.dateOnly) return formatDateOnly(fact.date.iso);
    if (fact.date.hasExplicitTime && !fact.date.hasExplicitTimezone) return fact.value;
    const formatted = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: fact.date.hasExplicitTime ? "numeric" : undefined,
      minute: fact.date.hasExplicitTime ? "2-digit" : undefined,
      timeZone: fact.date.timezone ?? "UTC",
      timeZoneName:
        fact.date.hasExplicitTimezone && !fact.date.timezoneAbbreviation
          ? "short"
          : undefined,
    }).format(new Date(fact.date.iso));
    return fact.date.timezoneAbbreviation
      ? `${formatted} ${fact.date.timezoneAbbreviation}`
      : formatted;
  }
  return fact.normalizedValue ?? fact.value;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(value: string, length: number) {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}

export function createShareCardSvg(summary: ShareSummary) {
  const title = escapeXml(truncate(summary.title, 58));
  const action = escapeXml(truncate(summary.actions[0]?.title ?? "Review the execution plan", 54));
  const noun = summary.counts.actions === 1 ? "next action" : "next actions";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F3F0E8"/>
  <rect x="44" y="44" width="1112" height="542" rx="6" fill="#FCFBF7" stroke="#D4D0C5"/>
  <rect x="44" y="44" width="12" height="542" fill="#B9E769"/>
  <text x="92" y="106" fill="#1E2A27" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="2">LIFEOPS INBOX</text>
  <text x="92" y="164" fill="#69716B" font-family="Arial, sans-serif" font-size="18" font-weight="700">Before</text>
  <text x="92" y="214" fill="#1E2A27" font-family="Georgia, serif" font-size="34">Paperwork with hidden deadlines</text>
  <line x1="92" y1="255" x2="1108" y2="255" stroke="#D4D0C5"/>
  <text x="92" y="310" fill="#69716B" font-family="Arial, sans-serif" font-size="18" font-weight="700">After</text>
  <text x="92" y="370" fill="#1E2A27" font-family="Georgia, serif" font-size="42" font-weight="700">${summary.counts.actions} ${noun}</text>
  <text x="92" y="418" fill="#1E2A27" font-family="Arial, sans-serif" font-size="22">${action}</text>
  <rect x="92" y="463" width="226" height="54" rx="27" fill="#1E2A27"/>
  <text x="122" y="497" fill="#FCFBF7" font-family="Arial, sans-serif" font-size="19" font-weight="700">${summary.counts.facts} cited facts</text>
  <text x="342" y="497" fill="#9A5B35" font-family="Arial, sans-serif" font-size="19" font-weight="700">${summary.counts.exceptions} items to review</text>
  <text x="92" y="558" fill="#69716B" font-family="Arial, sans-serif" font-size="15">Privacy-safe share • source text and identifiers excluded</text>
  <text x="1108" y="558" text-anchor="end" fill="#69716B" font-family="Arial, sans-serif" font-size="15">${title}</text>
</svg>`;
}

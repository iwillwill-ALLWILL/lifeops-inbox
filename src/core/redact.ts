import type { Analysis } from "./schema";

const SAFE_TITLES: Record<Analysis["documentKind"], string> = {
  bill: "Bill summary",
  travel: "Travel plan",
  notice: "Notice summary",
  medical: "Medical document summary",
  school: "School document summary",
  work: "Work document summary",
  event: "Event plan",
  unknown: "Document summary",
};

export function redactSensitiveText(input: string) {
  return input
    .replace(/((?:passenger|account holder|patient|student|employee|name)\s*:\s*)[^\n]+/gi, "$1[NAME]")
    .replace(/((?:service|mailing|billing|home)\s+address\s*:\s*)[^\n]+/gi, "$1[ADDRESS]")
    .replace(/((?:qr(?:\s+code)?|barcode)\s*:\s*)[^\n]+/gi, "$1[QR IDENTIFIER]")
    .replace(/((?:order\s+id|booking\s+reference|reservation\s+number|confirmation(?:\s+number)?|reference)\s*:\s*)[^\n]+/gi, "$1[REFERENCE]")
    .replace(/((?:account|card|payment)\s*(?:number|no\.?|#)?\s*:\s*)[\d\s-]{8,}/gi, "$1[PAYMENT NUMBER]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/g, "[PHONE]")
    .replace(/\b(?:\d[\s-]?){12,19}\b/g, "[PAYMENT NUMBER]");
}

export function toShareSummary(analysis: Analysis) {
  return {
    title: SAFE_TITLES[analysis.documentKind],
    documentKind: analysis.documentKind,
    confidence: analysis.confidence,
    counts: {
      facts: analysis.facts.length,
      actions: analysis.actions.length,
      exceptions: analysis.uncertainties.length + analysis.conflicts.length,
    },
    actions: analysis.actions.map((action) => ({
      title: redactSensitiveText(action.title),
      lane: action.lane,
      dueAt: action.dueAt,
    })),
    exceptions: [
      ...analysis.conflicts.map((item) => redactSensitiveText(item.message)),
      ...analysis.uncertainties.map((item) => redactSensitiveText(item.message)),
    ],
    privacyNote: "Source text and direct quotes are excluded. Personal and reference data are redacted.",
  };
}

export type ShareSummary = ReturnType<typeof toShareSummary>;

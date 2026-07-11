import type { Evidence } from "@/core/schema";

export type PdfNormalizedRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PdfPageGeometry = {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
};

export type PdfGeometryRun = {
  start: number;
  end: number;
  pageNumber: number;
  rotation: number;
  rect: PdfNormalizedRect;
};

export type PdfSourceMap = {
  sourceText: string;
  pageCount: number;
  pages: readonly PdfPageGeometry[];
  runs: readonly PdfGeometryRun[];
};

export type PdfDocumentSource = {
  file: File;
  map: PdfSourceMap;
};

export type PdfEvidenceLocator = {
  pageNumber: number;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  evidenceStart: number;
  rects: readonly PdfNormalizedRect[];
};

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

function isFinitePositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function isValidRect(rect: PdfNormalizedRect) {
  const values = [rect.left, rect.top, rect.width, rect.height];
  return values.every(Number.isFinite)
    && rect.left >= 0
    && rect.top >= 0
    && rect.width > 0
    && rect.height > 0
    && rect.left + rect.width <= 1
    && rect.top + rect.height <= 1;
}

function isValidSourceMap(source: PdfSourceMap) {
  if (!isPositiveInteger(source.pageCount) || source.pages.length !== source.pageCount) {
    return false;
  }

  const pageNumbers = new Set<number>();
  for (const page of source.pages) {
    if (
      !isPositiveInteger(page.pageNumber)
      || page.pageNumber > source.pageCount
      || !isFinitePositive(page.width)
      || !isFinitePositive(page.height)
      || !Number.isFinite(page.rotation)
      || pageNumbers.has(page.pageNumber)
    ) {
      return false;
    }
    pageNumbers.add(page.pageNumber);
  }

  const validRuns = source.runs.every((run) => (
    Number.isInteger(run.start)
    && Number.isInteger(run.end)
    && run.start >= 0
    && run.end > run.start
    && run.end <= source.sourceText.length
    && isPositiveInteger(run.pageNumber)
    && run.pageNumber <= source.pageCount
    && Number.isFinite(run.rotation)
    && isValidRect(run.rect)
  ));
  if (!validRuns) return false;

  const orderedRuns = source.runs.toSorted((left, right) => (
    left.start - right.start || left.end - right.end
  ));
  return orderedRuns.every((run, index) => (
    index === 0 || run.start >= orderedRuns[index - 1]!.end
  ));
}

export function locatePdfEvidence(
  source: PdfSourceMap,
  evidence: Evidence,
): PdfEvidenceLocator | null {
  if (
    !Number.isInteger(evidence.start)
    || !Number.isInteger(evidence.end)
    || evidence.start < 0
    || evidence.end <= evidence.start
    || evidence.end > source.sourceText.length
    || !isValidSourceMap(source)
  ) {
    return null;
  }
  if (source.sourceText.slice(evidence.start, evidence.end) !== evidence.quote) return null;

  const runs = source.runs
    .filter((run) => run.end > evidence.start && run.start < evidence.end)
    .toSorted((left, right) => left.start - right.start);
  if (!runs.length) return null;

  const pageNumber = runs[0].pageNumber;
  let coveredUntil = evidence.start;
  for (const run of runs) {
    if (
      run.start < evidence.start
      || run.end > evidence.end
      || run.pageNumber !== pageNumber
      || run.rotation !== 0
      || run.start > coveredUntil
    ) {
      return null;
    }
    coveredUntil = Math.max(coveredUntil, Math.min(run.end, evidence.end));
  }
  if (coveredUntil < evidence.end) return null;

  const page = source.pages.find((candidate) => candidate.pageNumber === pageNumber);
  if (!page || page.rotation !== 0) return null;

  return {
    pageNumber,
    pageCount: source.pageCount,
    pageWidth: page.width,
    pageHeight: page.height,
    evidenceStart: evidence.start,
    rects: runs.map((run) => run.rect),
  };
}

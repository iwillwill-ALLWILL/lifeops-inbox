"use client";

import type {
  PdfDocumentSource,
  PdfGeometryRun,
  PdfNormalizedRect,
  PdfPageGeometry,
  PdfSourceMap,
} from "./pdf-source-locator";
import { loadPdfJs } from "./pdfjs";

type ProgressListener = (progress: number, status: string) => void;

type PdfExtraction = {
  text: string;
  map: PdfSourceMap;
};

type Extractors = {
  pdfExtractor: (file: File) => Promise<string | PdfExtraction>;
  ocrExtractor: (file: File, onProgress?: ProgressListener) => Promise<string>;
};

export type ExtractionResult =
  | { text: string; method: "text" | "ocr" }
  | { text: string; method: "pdf"; source?: PdfDocumentSource };

type PdfTextItem = {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
  height?: number;
};

type PdfViewport = {
  width: number;
  height: number;
  rotation: number;
  convertToViewportPoint: (x: number, y: number) => unknown[];
};

type MappedGeometry = {
  pageNumber: number;
  rotation: number;
  rect: PdfNormalizedRect;
};

type MappedCharacter = {
  value: string;
  geometry?: MappedGeometry;
};

function shouldSeparatePdfItems(previous: PdfTextItem, current: PdfTextItem) {
  if (/\s$/.test(previous.str) || /^\s/.test(current.str)) return false;
  if (/^[,.:;!?%)}\]]/.test(current.str) || /[(\[{/$£€#@-]$/.test(previous.str)) {
    return false;
  }

  const previousX = previous.transform?.[4];
  const currentX = current.transform?.[4];
  const previousY = previous.transform?.[5];
  const currentY = current.transform?.[5];
  if (
    typeof previousX === "number" &&
    typeof currentX === "number" &&
    typeof previousY === "number" &&
    typeof currentY === "number" &&
    typeof previous.width === "number" &&
    Math.abs(previousY - currentY) < 1
  ) {
    const scale = Math.max(Math.abs(previous.transform?.[3] ?? 0), 1);
    return currentX - (previousX + previous.width) > scale * 0.15;
  }

  return true;
}

function appendCharacters(
  target: MappedCharacter[],
  value: string,
  geometry?: MappedGeometry,
) {
  for (let index = 0; index < value.length; index += 1) {
    target.push({ value: value[index]!, geometry });
  }
}

function mappedGeometryForItem(
  item: PdfTextItem,
  viewport: PdfViewport,
  pageNumber: number,
): MappedGeometry | undefined {
  const transform = item.transform?.slice(0, 6);
  if (
    !transform
    || transform.length !== 6
    || !transform.every(Number.isFinite)
    || !Number.isFinite(item.width)
    || !Number.isFinite(item.height)
    || (item.width ?? 0) <= 0
    || (item.height ?? 0) <= 0
    || !Number.isFinite(viewport.width)
    || !Number.isFinite(viewport.height)
    || viewport.width <= 0
    || viewport.height <= 0
  ) {
    return undefined;
  }

  const [a, b, c, d, x, y] = transform;
  const first = viewport.convertToViewportPoint(x!, y!);
  const second = viewport.convertToViewportPoint(x! + item.width!, y! + item.height!);
  const coordinates = [first[0], first[1], second[0], second[1]];
  if (!coordinates.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return undefined;
  }

  const left = Math.min(first[0] as number, second[0] as number) / viewport.width;
  const top = Math.min(first[1] as number, second[1] as number) / viewport.height;
  const width = Math.abs((second[0] as number) - (first[0] as number)) / viewport.width;
  const height = Math.abs((second[1] as number) - (first[1] as number)) / viewport.height;
  const axisAligned = Math.abs(b!) < 0.0001 && Math.abs(c!) < 0.0001 && a! > 0 && d! > 0;
  const itemRotation = axisAligned
    ? 0
    : Math.round((Math.atan2(b!, a!) * 180) / Math.PI) || 1;

  return {
    pageNumber,
    rotation: viewport.rotation + itemRotation,
    rect: { left, top, width, height },
  };
}

function reconstructMappedPdfText(
  items: unknown[],
  viewport: PdfViewport,
  pageNumber: number,
) {
  const characters: MappedCharacter[] = [];
  let previous: PdfTextItem | undefined;
  let previousGeometry: MappedGeometry | undefined;

  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item)) continue;
    const current = item as PdfTextItem;
    if (typeof current.str !== "string") continue;
    const geometry = mappedGeometryForItem(current, viewport, pageNumber);
    if (previous && shouldSeparatePdfItems(previous, current)) {
      appendCharacters(characters, " ", geometry ?? previousGeometry);
    }
    appendCharacters(characters, current.str, geometry);
    if (current.hasEOL) {
      appendCharacters(characters, "\n", geometry);
      previous = undefined;
      previousGeometry = undefined;
    } else if (current.str) {
      previous = current;
      previousGeometry = geometry;
    }
  }

  return characters;
}

function trimMappedCharacters(characters: MappedCharacter[]) {
  let start = 0;
  let end = characters.length;
  while (start < end && characters[start]!.value.trim() === "") start += 1;
  while (end > start && characters[end - 1]!.value.trim() === "") end -= 1;
  return characters.slice(start, end);
}

function normalizeMappedLine(characters: MappedCharacter[]) {
  const collapsed: MappedCharacter[] = [];
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index]!;
    if (character.value !== " " && character.value !== "\t") {
      collapsed.push(character);
      continue;
    }

    let geometry = character.geometry;
    while (
      index + 1 < characters.length
      && (characters[index + 1]!.value === " " || characters[index + 1]!.value === "\t")
    ) {
      index += 1;
      geometry ??= characters[index]!.geometry;
    }
    collapsed.push({ value: " ", geometry });
  }
  return trimMappedCharacters(collapsed);
}

function normalizeMappedPdfText(characters: MappedCharacter[]) {
  const normalized: MappedCharacter[] = [];
  let lineStart = 0;
  for (let index = 0; index <= characters.length; index += 1) {
    if (index < characters.length && characters[index]!.value !== "\n") continue;
    normalized.push(...normalizeMappedLine(characters.slice(lineStart, index)));
    if (index < characters.length) normalized.push(characters[index]!);
    lineStart = index + 1;
  }
  return trimMappedCharacters(normalized);
}

function geometryRuns(characters: MappedCharacter[], sourceStart: number) {
  const runs: PdfGeometryRun[] = [];
  let active: PdfGeometryRun | undefined;
  let activeGeometry: MappedGeometry | undefined;

  for (let index = 0; index < characters.length; index += 1) {
    const geometry = characters[index]!.geometry;
    const position = sourceStart + index;
    if (!geometry) {
      active = undefined;
      activeGeometry = undefined;
      continue;
    }
    if (active && activeGeometry === geometry && active.end === position) {
      active.end += 1;
      continue;
    }
    active = {
      start: position,
      end: position + 1,
      pageNumber: geometry.pageNumber,
      rotation: geometry.rotation,
      rect: geometry.rect,
    };
    runs.push(active);
    activeGeometry = geometry;
  }
  return runs;
}

async function extractPdfDocument(file: File): Promise<PdfExtraction> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    const document = await loadingTask.promise;
    const pageCount = document.numPages;
    const pageGeometries: PdfPageGeometry[] = [];
    const extractedPages: Array<{
      pageNumber: number;
      text: string;
      characters: MappedCharacter[];
    }> = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 }) as PdfViewport;
      pageGeometries.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        rotation: viewport.rotation,
      });
      const content = await page.getTextContent();
      const characters = normalizeMappedPdfText(
        reconstructMappedPdfText(content.items, viewport, pageNumber),
      );
      const text = characters.map((character) => character.value).join("");
      if (text) extractedPages.push({ pageNumber, text, characters });
    }

    let text = "";
    const runs: PdfGeometryRun[] = [];
    for (const page of extractedPages) {
      if (text) text += "\n\n";
      const prefix = `[Page ${page.pageNumber}]\n`;
      text += prefix;
      runs.push(...geometryRuns(page.characters, text.length));
      text += page.text;
    }

    return {
      text,
      map: {
        sourceText: text,
        pageCount,
        pages: pageGeometries,
        runs,
      },
    };
  } finally {
    await loadingTask.destroy();
  }
}

export async function extractPdfText(file: File) {
  return (await extractPdfDocument(file)).text;
}

export async function extractImageText(file: File, onProgress?: ProgressListener) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message.status && typeof message.progress === "number") {
        onProgress?.(message.progress, message.status);
      }
    },
  });
  try {
    const result = await worker.recognize(file);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}

const defaultExtractors: Extractors = {
  pdfExtractor: extractPdfDocument,
  ocrExtractor: extractImageText,
};

export async function extractDocument(
  file: File,
  extractors: Extractors = defaultExtractors,
  onProgress?: ProgressListener,
): Promise<ExtractionResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type === "text/plain" || extension === "txt") {
    const text = (await file.text()).trim();
    if (!text) throw new Error("This text file is empty. Choose another file or paste text.");
    return { text, method: "text" };
  }

  if (file.type === "application/pdf" || extension === "pdf") {
    const extracted = await extractors.pdfExtractor(file);
    const extractedText = typeof extracted === "string" ? extracted : extracted.text;
    const text = extractedText.trim();
    if (!text) {
      throw new Error("This PDF has no selectable text. Try an image export or paste its text.");
    }
    const source = typeof extracted === "string"
      || extracted.text !== text
      || extracted.map.sourceText !== text
      ? undefined
      : { file, map: extracted.map };
    return source ? { text, method: "pdf", source } : { text, method: "pdf" };
  }

  if (/^image\/(?:png|jpeg|webp)$/.test(file.type) || ["png", "jpg", "jpeg", "webp"].includes(extension ?? "")) {
    try {
      const text = (await extractors.ocrExtractor(file, onProgress)).trim();
      if (!text) throw new Error("empty OCR result");
      return { text, method: "ocr" };
    } catch {
      throw new Error(
        "Image OCR could not start or finish. Try a clearer image or paste the text instead.",
      );
    }
  }

  throw new Error("Unsupported file. Use TXT, PDF, PNG, JPG, or WEBP.");
}

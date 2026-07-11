"use client";

type ProgressListener = (progress: number, status: string) => void;

type Extractors = {
  pdfExtractor: (file: File) => Promise<string>;
  ocrExtractor: (file: File, onProgress?: ProgressListener) => Promise<string>;
};

export type ExtractionResult = {
  text: string;
  method: "text" | "pdf" | "ocr";
};

type PdfTextItem = {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
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

function reconstructPdfText(items: unknown[]) {
  let text = "";
  let previous: PdfTextItem | undefined;

  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item)) continue;
    const current = item as PdfTextItem;
    if (previous && shouldSeparatePdfItems(previous, current)) text += " ";
    text += current.str;
    if (current.hasEOL) {
      text += "\n";
      previous = undefined;
    } else if (current.str) {
      previous = current;
    }
  }

  return text;
}

export async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = reconstructPdfText(content.items)
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .trim();
    if (text) pages.push(`[Page ${pageNumber}]\n${text}`);
  }

  return pages.join("\n\n");
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
  pdfExtractor: extractPdfText,
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
    const text = (await extractors.pdfExtractor(file)).trim();
    if (!text) {
      throw new Error("This PDF has no selectable text. Try an image export or paste its text.");
    }
    return { text, method: "pdf" };
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

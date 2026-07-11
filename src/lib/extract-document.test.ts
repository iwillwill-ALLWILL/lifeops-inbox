import { describe, expect, it, vi } from "vitest";
import { extractDocument, extractPdfText } from "./extract-document";

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({
          items: [
            { str: "First", hasEOL: false, transform: [1, 0, 0, 1, 0, 30], width: 24 },
            { str: "line", hasEOL: false, transform: [1, 0, 0, 1, 29, 30], width: 18 },
            { str: ":", hasEOL: true, transform: [1, 0, 0, 1, 47, 30], width: 3 },
            { str: "Amount", hasEOL: false, transform: [1, 0, 0, 1, 0, 15], width: 32 },
            { str: "due", hasEOL: false, transform: [1, 0, 0, 1, 37, 15], width: 16 },
            { str: ":", hasEOL: false, transform: [1, 0, 0, 1, 53, 15], width: 3 },
            { str: "$42.00", hasEOL: true, transform: [1, 0, 0, 1, 61, 15], width: 30 },
            { str: "Split", hasEOL: false },
            { str: "words", hasEOL: false },
          ],
        }),
      }),
    }),
  }),
}));

const file = (name: string, type: string, content = "hello") =>
  new File([content], name, { type });

describe("extractDocument", () => {
  it("preserves PDF hasEOL boundaries and spaces between split TextItems", async () => {
    const result = await extractPdfText(file("notice.pdf", "application/pdf"));

    expect(result).toBe("[Page 1]\nFirst line:\nAmount due: $42.00\nSplit words");
  });

  it("reads plain text locally without invoking document adapters", async () => {
    const pdfExtractor = vi.fn();
    const ocrExtractor = vi.fn();

    const result = await extractDocument(file("notice.txt", "text/plain", "Deadline: Friday"), {
      pdfExtractor,
      ocrExtractor,
    });

    expect(result).toEqual({ text: "Deadline: Friday", method: "text" });
    expect(pdfExtractor).not.toHaveBeenCalled();
    expect(ocrExtractor).not.toHaveBeenCalled();
  });

  it("routes PDFs to client extraction and rejects empty extracted text", async () => {
    const pdf = file("scan.pdf", "application/pdf");
    const pdfExtractor = vi.fn().mockResolvedValue("   ");

    await expect(
      extractDocument(pdf, { pdfExtractor, ocrExtractor: vi.fn() }),
    ).rejects.toThrow(/no selectable text/i);
    expect(pdfExtractor).toHaveBeenCalledWith(pdf);
  });

  it("turns OCR initialization failures into an actionable paste-text fallback", async () => {
    const image = file("notice.png", "image/png");

    await expect(
      extractDocument(image, {
        pdfExtractor: vi.fn(),
        ocrExtractor: vi.fn().mockRejectedValue(new Error("worker failed")),
      }),
    ).rejects.toThrow(/clearer image or paste the text/i);
  });

  it("rejects unsupported files with the accepted formats", async () => {
    await expect(
      extractDocument(file("sheet.csv", "text/csv"), {
        pdfExtractor: vi.fn(),
        ocrExtractor: vi.fn(),
      }),
    ).rejects.toThrow(/TXT, PDF, PNG, JPG, or WEBP/);
  });
});

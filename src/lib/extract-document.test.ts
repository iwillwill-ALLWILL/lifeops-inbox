import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractDocument, extractPdfText } from "./extract-document";
import { locatePdfEvidence, type PdfDocumentSource } from "./pdf-source-locator";

type MockPdfItem = {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
  height?: number;
};

type MockPdfPage = {
  width: number;
  height: number;
  rotation: number;
  items: MockPdfItem[];
};

const pdfMock = vi.hoisted(() => ({
  destroy: vi.fn(),
  loadError: undefined as Error | undefined,
  pages: [] as MockPdfPage[],
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({
    destroy: pdfMock.destroy,
    promise: pdfMock.loadError
      ? Promise.reject(pdfMock.loadError)
      : Promise.resolve({
          numPages: pdfMock.pages.length,
          getPage: async (pageNumber: number) => {
            const page = pdfMock.pages[pageNumber - 1]!;
            return {
              getTextContent: async () => ({ items: page.items }),
              getViewport: () => ({
                width: page.width,
                height: page.height,
                rotation: page.rotation,
                convertToViewportPoint: (x: number, y: number) => [x, page.height - y],
              }),
            };
          },
        }),
  }),
}));

function defaultPdfPages(): MockPdfPage[] {
  return [{
    width: 200,
    height: 100,
    rotation: 0,
    items: [
      { str: "First", hasEOL: false, transform: [1, 0, 0, 1, 0, 30], width: 24, height: 10 },
      { str: "line", hasEOL: false, transform: [1, 0, 0, 1, 29, 30], width: 18, height: 10 },
      { str: ":", hasEOL: true, transform: [1, 0, 0, 1, 47, 30], width: 3, height: 10 },
      { str: "Amount", hasEOL: false, transform: [1, 0, 0, 1, 0, 15], width: 32, height: 10 },
      { str: "due", hasEOL: false, transform: [1, 0, 0, 1, 37, 15], width: 16, height: 10 },
      { str: ":", hasEOL: false, transform: [1, 0, 0, 1, 53, 15], width: 3, height: 10 },
      { str: "$42.00", hasEOL: true, transform: [1, 0, 0, 1, 61, 15], width: 30, height: 10 },
      { str: "Split", hasEOL: false },
      { str: "words", hasEOL: false },
    ],
  }];
}

beforeEach(() => {
  pdfMock.destroy.mockReset().mockResolvedValue(undefined);
  pdfMock.loadError = undefined;
  pdfMock.pages = defaultPdfPages();
});

const file = (name: string, type: string, content = "hello") =>
  new File([content], name, { type });

describe("extractDocument", () => {
  it("preserves PDF hasEOL boundaries and spaces between split TextItems", async () => {
    const result = await extractPdfText(file("notice.pdf", "application/pdf"));

    expect(result).toBe("[Page 1]\nFirst line:\nAmount due: $42.00\nSplit words");
  });

  it("destroys the PDF loading task when document loading rejects", async () => {
    pdfMock.loadError = new Error("invalid PDF");

    await expect(extractPdfText(file("broken.pdf", "application/pdf"))).rejects.toThrow(
      "invalid PDF",
    );
    expect(pdfMock.destroy).toHaveBeenCalledOnce();
  });

  it("preserves canonical offsets while mapping a repeated quote to its second page", async () => {
    pdfMock.pages = [
      {
        width: 200,
        height: 100,
        rotation: 0,
        items: [
          {
            str: "Previous amount: $42.00",
            hasEOL: true,
            transform: [1, 0, 0, 1, 10, 75],
            width: 140,
            height: 10,
          },
        ],
      },
      {
        width: 200,
        height: 100,
        rotation: 0,
        items: [
          { str: "Amount", transform: [1, 0, 0, 1, 10, 25], width: 40, height: 10 },
          { str: "due", transform: [1, 0, 0, 1, 55, 25], width: 18, height: 10 },
          { str: ":", transform: [1, 0, 0, 1, 73, 25], width: 3, height: 10 },
          { str: " ", transform: [1, 0, 0, 1, 76, 25], width: 6, height: 10 },
          { str: "$42", transform: [1, 0, 0, 1, 82, 25], width: 24, height: 10 },
          { str: ".00", hasEOL: true, transform: [1, 0, 0, 1, 106, 25], width: 18, height: 10 },
        ],
      },
    ];
    const pdf = file("repeated.pdf", "application/pdf");

    const result = await extractDocument(pdf);
    const pdfResult = result as typeof result & { source?: PdfDocumentSource };
    const quote = "$42.00";
    const start = result.text.lastIndexOf(quote);

    expect(result.text).toBe(
      "[Page 1]\nPrevious amount: $42.00\n\n[Page 2]\nAmount due: $42.00",
    );
    expect(pdfResult.source?.file).toBe(pdf);
    const firstStart = result.text.indexOf(quote);
    expect(
      locatePdfEvidence(pdfResult.source!.map, {
        quote,
        start: firstStart,
        end: firstStart + quote.length,
      }),
    ).toBeNull();
    expect(
      locatePdfEvidence(pdfResult.source!.map, {
        quote,
        start,
        end: start + quote.length,
      }),
    ).toMatchObject({ pageNumber: 2, evidenceStart: start });
    const lineQuote = "Amount due: $42.00";
    const lineStart = result.text.lastIndexOf(lineQuote);
    expect(
      locatePdfEvidence(pdfResult.source!.map, {
        quote: lineQuote,
        start: lineStart,
        end: lineStart + lineQuote.length,
      }),
    ).toMatchObject({ pageNumber: 2, evidenceStart: lineStart });
  });

  it.each([
    {
      name: "rotated",
      item: {
        str: "Amount due: $42.00",
        hasEOL: true,
        transform: [0, 1, -1, 0, 50, 25],
        width: 100,
        height: 10,
      },
    },
    {
      name: "malformed",
      item: {
        str: "Amount due: $42.00",
        hasEOL: true,
        transform: [1, 0, 0, 1, 10, 25],
        width: Number.NaN,
        height: 10,
      },
    },
  ])("keeps $name text but withholds unsafe geometry", async ({ item }) => {
    pdfMock.pages = [{
      width: 200,
      height: 100,
      rotation: 0,
      items: [item],
    }];

    const result = await extractDocument(file(`${item.str}.pdf`, "application/pdf"));
    const pdfResult = result as typeof result & { source?: PdfDocumentSource };
    const quote = "$42.00";
    const start = result.text.indexOf(quote);

    expect(result.text).toBe("[Page 1]\nAmount due: $42.00");
    expect(
      locatePdfEvidence(pdfResult.source!.map, {
        quote,
        start,
        end: start + quote.length,
      }),
    ).toBeNull();
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

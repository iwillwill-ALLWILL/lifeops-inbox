import { describe, expect, it } from "vitest";
import { locatePdfEvidence, type PdfSourceMap } from "./pdf-source-locator";

function validLocatorFixture() {
  const quote = "$42.00";
  const sourceText = `Amount due: ${quote}`;
  const start = sourceText.indexOf(quote);
  const source: PdfSourceMap = {
    sourceText,
    pageCount: 1,
    pages: [{ pageNumber: 1, width: 200, height: 100, rotation: 0 }],
    runs: [
      {
        start,
        end: start + quote.length,
        pageNumber: 1,
        rotation: 0,
        rect: { left: 0.1, top: 0.2, width: 0.2, height: 0.08 },
      },
    ],
  };
  return { source, evidence: { quote, start, end: start + quote.length } };
}

describe("locatePdfEvidence", () => {
  it("selects complete same-page coverage by offsets when quotes repeat", () => {
    const quote = "$42.00";
    const sourceText = [
      "[Page 1]",
      `Amount due: ${quote}`,
      "",
      "[Page 2]",
      `Amount due: ${quote}`,
    ].join("\n");
    const firstStart = sourceText.indexOf(quote);
    const secondStart = sourceText.lastIndexOf(quote);
    const source = {
      sourceText,
      pageCount: 2,
      pages: [
        { pageNumber: 1, width: 200, height: 100, rotation: 0 },
        { pageNumber: 2, width: 200, height: 100, rotation: 0 },
      ],
      runs: [
        {
          start: firstStart,
          end: firstStart + quote.length,
          pageNumber: 1,
          rotation: 0,
          rect: { left: 0.1, top: 0.1, width: 0.2, height: 0.08 },
        },
        {
          start: secondStart,
          end: secondStart + 3,
          pageNumber: 2,
          rotation: 0,
          rect: { left: 0.55, top: 0.7, width: 0.09, height: 0.08 },
        },
        {
          start: secondStart + 3,
          end: secondStart + quote.length,
          pageNumber: 2,
          rotation: 0,
          rect: { left: 0.64, top: 0.7, width: 0.08, height: 0.08 },
        },
      ],
    };

    expect(
      locatePdfEvidence(source, {
        quote,
        start: secondStart,
        end: secondStart + quote.length,
      }),
    ).toEqual({
      pageNumber: 2,
      pageCount: 2,
      pageWidth: 200,
      pageHeight: 100,
      evidenceStart: secondStart,
      rects: [
        { left: 0.55, top: 0.7, width: 0.09, height: 0.08 },
        { left: 0.64, top: 0.7, width: 0.08, height: 0.08 },
      ],
    });
  });

  it.each([
    { name: "missing first character", ranges: [[1, 6]] },
    { name: "missing a middle character", ranges: [[0, 3], [4, 6]] },
    { name: "missing final character", ranges: [[0, 5]] },
  ])("rejects incomplete coverage: $name", ({ ranges }) => {
    const quote = "$42.00";
    const sourceText = `Amount due: ${quote}`;
    const start = sourceText.indexOf(quote);
    const source = {
      sourceText,
      pageCount: 1,
      pages: [{ pageNumber: 1, width: 200, height: 100, rotation: 0 }],
      runs: ranges.map(([from, to], index) => ({
        start: start + from,
        end: start + to,
        pageNumber: 1,
        rotation: 0,
        rect: { left: 0.1 + index * 0.1, top: 0.2, width: 0.08, height: 0.08 },
      })),
    };

    expect(
      locatePdfEvidence(source, { quote, start, end: start + quote.length }),
    ).toBeNull();
  });

  it.each([
    { name: "first run starts before the evidence", ranges: [[-1, 3], [3, 6]] },
    { name: "last run ends after the evidence", ranges: [[0, 3], [3, 7]] },
    { name: "one run extends past both evidence boundaries", ranges: [[-1, 7]] },
  ])("rejects partial text-item geometry: $name", ({ ranges }) => {
    const quote = "$42.00";
    const sourceText = `x${quote}y`;
    const start = sourceText.indexOf(quote);
    const source: PdfSourceMap = {
      sourceText,
      pageCount: 1,
      pages: [{ pageNumber: 1, width: 200, height: 100, rotation: 0 }],
      runs: ranges.map(([from, to], index) => ({
        start: start + from,
        end: start + to,
        pageNumber: 1,
        rotation: 0,
        rect: { left: 0.1 + index * 0.1, top: 0.2, width: 0.08, height: 0.08 },
      })),
    };

    expect(
      locatePdfEvidence(source, { quote, start, end: start + quote.length }),
    ).toBeNull();
  });

  it("rejects either occurrence when identical quotes share one geometry run", () => {
    const quote = "$42.00";
    const sourceText = `${quote} / ${quote}`;
    const source: PdfSourceMap = {
      sourceText,
      pageCount: 1,
      pages: [{ pageNumber: 1, width: 200, height: 100, rotation: 0 }],
      runs: [{
        start: 0,
        end: sourceText.length,
        pageNumber: 1,
        rotation: 0,
        rect: { left: 0.1, top: 0.2, width: 0.4, height: 0.08 },
      }],
    };
    const firstStart = sourceText.indexOf(quote);
    const secondStart = sourceText.lastIndexOf(quote);

    expect(
      locatePdfEvidence(source, {
        quote,
        start: firstStart,
        end: firstStart + quote.length,
      }),
    ).toBeNull();
    expect(
      locatePdfEvidence(source, {
        quote,
        start: secondStart,
        end: secondStart + quote.length,
      }),
    ).toBeNull();
  });

  it.each<Array<[string, (source: PdfSourceMap) => PdfSourceMap]>>([
    ["zero page count", (source) => ({ ...source, pageCount: 0 })],
    ["duplicate page metadata", (source) => ({
      ...source,
      pageCount: 2,
      pages: [source.pages[0]!, { ...source.pages[0]! }],
    })],
    ["nonpositive page number", (source) => ({
      ...source,
      pages: [{ ...source.pages[0]!, pageNumber: 0 }],
    })],
    ["non-finite page width", (source) => ({
      ...source,
      pages: [{ ...source.pages[0]!, width: Number.NaN }],
    })],
    ["nonpositive page height", (source) => ({
      ...source,
      pages: [{ ...source.pages[0]!, height: 0 }],
    })],
    ["negative run start", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, start: -1 }],
    })],
    ["empty run range", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, end: source.runs[0]!.start }],
    })],
    ["fractional run range", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, start: source.runs[0]!.start + 0.5 }],
    })],
    ["run past source text", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, end: source.sourceText.length + 1 }],
    })],
    ["nonpositive run page", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, pageNumber: 0 }],
    })],
    ["non-finite rectangle", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, rect: { ...source.runs[0]!.rect, left: Number.NaN } }],
    })],
    ["infinite rectangle", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, rect: { ...source.runs[0]!.rect, left: Number.POSITIVE_INFINITY } }],
    })],
    ["negative rectangle origin", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, rect: { ...source.runs[0]!.rect, top: -0.1 } }],
    })],
    ["nonpositive rectangle size", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, rect: { ...source.runs[0]!.rect, width: 0 } }],
    })],
    ["rectangle outside page", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, rect: { ...source.runs[0]!.rect, left: 0.9, width: 0.2 } }],
    })],
  ])("rejects malformed geometry: %s", (_name, mutate) => {
    const { source, evidence } = validLocatorFixture();

    expect(locatePdfEvidence(mutate(source), evidence)).toBeNull();
  });

  it("rejects fractional evidence offsets even when JavaScript slice would coerce them", () => {
    const { source, evidence } = validLocatorFixture();

    expect(
      locatePdfEvidence(source, { ...evidence, start: evidence.start + 0.5 }),
    ).toBeNull();
  });

  it("rejects evidence that no longer matches the sidecar source text", () => {
    const { source, evidence } = validLocatorFixture();

    expect(
      locatePdfEvidence(source, { ...evidence, quote: "$43.00" }),
    ).toBeNull();
  });

  it.each<Array<[string, (source: PdfSourceMap) => PdfSourceMap]>>([
    ["rotated page", (source) => ({
      ...source,
      pages: [{ ...source.pages[0]!, rotation: 90 }],
    })],
    ["rotated text run", (source) => ({
      ...source,
      runs: [{ ...source.runs[0]!, rotation: 12 }],
    })],
    ["duplicate run", (source) => ({
      ...source,
      runs: [source.runs[0]!, { ...source.runs[0]! }],
    })],
    ["overlapping runs", (source) => ({
      ...source,
      runs: [
        { ...source.runs[0]!, end: source.runs[0]!.start + 4 },
        { ...source.runs[0]!, start: source.runs[0]!.start + 3 },
      ],
    })],
    ["coverage split across pages", (source) => ({
      ...source,
      pageCount: 2,
      pages: [
        source.pages[0]!,
        { pageNumber: 2, width: 200, height: 100, rotation: 0 },
      ],
      runs: [
        { ...source.runs[0]!, end: source.runs[0]!.start + 3 },
        { ...source.runs[0]!, start: source.runs[0]!.start + 3, pageNumber: 2 },
      ],
    })],
  ])("rejects unsafe coverage: %s", (_name, mutate) => {
    const { source, evidence } = validLocatorFixture();

    expect(locatePdfEvidence(mutate(source), evidence)).toBeNull();
  });

  it("keeps an unrotated page locatable when another page contains rotated text", () => {
    const { source, evidence } = validLocatorFixture();
    const rotatedStart = source.sourceText.length;
    const withRotatedPage: PdfSourceMap = {
      ...source,
      sourceText: `${source.sourceText}\nrotated`,
      pageCount: 2,
      pages: [
        source.pages[0]!,
        { pageNumber: 2, width: 100, height: 200, rotation: 90 },
      ],
      runs: [
        source.runs[0]!,
        {
          start: rotatedStart + 1,
          end: rotatedStart + 8,
          pageNumber: 2,
          rotation: 90,
          rect: { left: 0.2, top: 0.2, width: 0.1, height: 0.3 },
        },
      ],
    };

    expect(locatePdfEvidence(withRotatedPage, evidence)).toMatchObject({ pageNumber: 1 });
  });
});

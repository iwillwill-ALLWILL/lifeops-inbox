// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PdfDocumentSource,
  PdfEvidenceLocator,
  PdfGeometryRun,
} from "@/lib/pdf-source-locator";
import { LifeOpsApp } from "./lifeops-app";
import { PdfEvidencePreview } from "./pdf-evidence-preview";

const mocks = vi.hoisted(() => ({
  extractDocument: vi.fn(),
  getDocument: vi.fn(),
  loadPdfJs: vi.fn(),
}));

vi.mock("@/lib/extract-document", () => ({
  extractDocument: mocks.extractDocument,
}));

vi.mock("@/lib/pdfjs", () => ({
  loadPdfJs: mocks.loadPdfJs,
}));

const pdfText = [
  "[Page 1]",
  "Previous amount: $42.00",
  "",
  "[Page 2]",
  "Amount due: $42.00",
  "Due date: July 14, 2026",
  "Status: OVERDUE",
].join("\n");

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function deferredValue<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function pdfSourceWithSecondQuoteRuns(
  replaceRuns?: (runs: PdfGeometryRun[]) => PdfGeometryRun[],
): PdfDocumentSource {
  const file = new File(["pdf"], "source-locator.pdf", {
    type: "application/pdf",
    lastModified: 1_720_696_800_000,
  });
  Object.defineProperty(file, "arrayBuffer", {
    configurable: true,
    value: vi.fn().mockResolvedValue(new TextEncoder().encode("pdf").buffer),
  });
  const firstAmount = pdfText.indexOf("$42.00");
  const secondAmount = pdfText.lastIndexOf("$42.00");
  const date = pdfText.indexOf("July 14, 2026");
  const status = pdfText.indexOf("OVERDUE");
  const runs: PdfGeometryRun[] = [
    {
      start: firstAmount,
      end: firstAmount + 6,
      pageNumber: 1,
      rotation: 0,
      rect: { left: 0.12, top: 0.2, width: 0.15, height: 0.05 },
    },
    {
      start: secondAmount,
      end: secondAmount + 6,
      pageNumber: 2,
      rotation: 0,
      rect: { left: 0.62, top: 0.72, width: 0.15, height: 0.05 },
    },
    {
      start: date,
      end: date + "July 14, 2026".length,
      pageNumber: 2,
      rotation: 0,
      rect: { left: 0.14, top: 0.35, width: 0.3, height: 0.05 },
    },
    {
      start: status,
      end: status + "OVERDUE".length,
      pageNumber: 2,
      rotation: 0,
      rect: { left: 0.14, top: 0.45, width: 0.18, height: 0.05 },
    },
  ];
  return {
    file,
    map: {
      sourceText: pdfText,
      pageCount: 2,
      pages: [
        { pageNumber: 1, width: 612, height: 792, rotation: 0 },
        { pageNumber: 2, width: 612, height: 792, rotation: 0 },
      ],
      runs: replaceRuns?.(runs) ?? runs,
    },
  };
}

async function uploadPdfIntoCurrentApp(source: PdfDocumentSource) {
  mocks.extractDocument.mockResolvedValueOnce({
    text: pdfText,
    method: "pdf",
    source,
  });
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).not.toBeNull();
  fireEvent.change(input!, { target: { files: [source.file] } });
  await screen.findByText(/source-locator\.pdf read locally/i);
}

async function uploadPdf(source: PdfDocumentSource) {
  render(<LifeOpsApp />);
  await uploadPdfIntoCurrentApp(source);
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
  mocks.getDocument.mockImplementation(() => ({
    destroy: vi.fn().mockResolvedValue(undefined),
    promise: Promise.resolve({
      numPages: 2,
      getPage: async () => ({
        getViewport: ({ scale }: { scale: number }) => ({
          width: 612 * scale,
          height: 792 * scale,
          rotation: 0,
        }),
        render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
      }),
    }),
  }));
  mocks.loadPdfJs.mockResolvedValue({
    getDocument: mocks.getDocument,
  });
});

afterEach(() => {
  vi.useRealTimers();
  mocks.extractDocument.mockReset();
  mocks.getDocument.mockReset();
  mocks.loadPdfJs.mockClear();
});

describe("LifeOpsApp", () => {
  it("runs a built-in sample through the parser and connects a fact to its exact source", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    render(<LifeOpsApp />);

    fireEvent.click(screen.getByRole("button", { name: /Overdue renewal bill/i }));

    expect(await screen.findByText("Pay $184.62")).toBeInTheDocument();
    expect(screen.getByText(/Built-in sample loaded/i)).toBeInTheDocument();

    scrollIntoView.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Amount due.*\$184\.62/i }));

    const mark = screen.getByTestId("selected-evidence");
    expect(mark.tagName).toBe("MARK");
    expect(mark).toHaveTextContent("$184.62");
    expect(screen.queryByRole("figure", { name: /Original PDF page/i })).not.toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("scrolls selected evidence without smooth motion when reduced motion is preferred", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    render(<LifeOpsApp />);
    fireEvent.click(screen.getByRole("button", { name: /Overdue renewal bill/i }));

    scrollIntoView.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Amount due.*\$184\.62/i }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
  });

  it("keeps pasted text local and shows a concrete empty-input recovery", () => {
    render(<LifeOpsApp />);

    fireEvent.click(screen.getByRole("button", { name: /Get next actions/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Paste a notice or choose a sample/i);
  });

  it("keeps a manual edit when an older PDF extraction completes", async () => {
    const extraction = deferredValue<{
      text: string;
      method: "pdf";
      source: PdfDocumentSource;
    }>();
    const source = pdfSourceWithSecondQuoteRuns();
    mocks.extractDocument.mockReturnValueOnce(extraction.promise);
    render(<LifeOpsApp />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    fireEvent.change(input!, { target: { files: [source.file] } });
    await screen.findByText(/Reading source-locator\.pdf locally/i);
    fireEvent.change(screen.getByLabelText(/Paste the notice/i), {
      target: { value: "Amount due: $99.00\nDue date: August 20, 2026" },
    });

    await act(async () => {
      extraction.resolve({ text: pdfText, method: "pdf", source });
      await extraction.promise;
    });

    expect(screen.getByLabelText(/Paste the notice/i)).toHaveValue(
      "Amount due: $99.00\nDue date: August 20, 2026",
    );
    expect(screen.queryByText(/source-locator\.pdf read locally/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Get next actions/i })).toBeEnabled();
  });

  it("keeps a built-in sample when an older PDF extraction completes", async () => {
    const extraction = deferredValue<{
      text: string;
      method: "pdf";
      source: PdfDocumentSource;
    }>();
    const source = pdfSourceWithSecondQuoteRuns();
    mocks.extractDocument.mockReturnValueOnce(extraction.promise);
    render(<LifeOpsApp />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    fireEvent.change(input!, { target: { files: [source.file] } });
    await screen.findByText(/Reading source-locator\.pdf locally/i);
    fireEvent.click(screen.getByRole("button", { name: /Overdue renewal bill/i }));
    expect(await screen.findByText("Pay $184.62")).toBeInTheDocument();

    await act(async () => {
      extraction.resolve({ text: pdfText, method: "pdf", source });
      await extraction.promise;
    });

    expect(screen.getByText("Pay $184.62")).toBeInTheDocument();
    expect(screen.queryByText("Pay $42.00")).not.toBeInTheDocument();
    expect(screen.getByText(/Built-in sample loaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/source-locator\.pdf read locally/i)).not.toBeInTheDocument();
  });

  it("keeps the newer file when an older file extraction completes later", async () => {
    const olderExtraction = deferredValue<{ text: string; method: "text" }>();
    const newerExtraction = deferredValue<{ text: string; method: "text" }>();
    const progressCallbacks: Array<(value: number) => void> = [];
    mocks.extractDocument
      .mockImplementationOnce((_file, _options, onProgress) => {
        progressCallbacks.push(onProgress);
        return olderExtraction.promise;
      })
      .mockImplementationOnce((_file, _options, onProgress) => {
        progressCallbacks.push(onProgress);
        return newerExtraction.promise;
      });
    render(<LifeOpsApp />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    const olderFile = new File(["older"], "older.txt", { type: "text/plain" });
    const newerFile = new File(["newer"], "newer.txt", { type: "text/plain" });

    fireEvent.change(input!, { target: { files: [olderFile] } });
    fireEvent.change(input!, { target: { files: [newerFile] } });
    act(() => {
      progressCallbacks[1](0.25);
      progressCallbacks[0](0.9);
    });
    expect(screen.getByLabelText("OCR 25 percent complete")).toBeInTheDocument();

    await act(async () => {
      newerExtraction.resolve({
        text: "Amount due: $88.00\nDue date: August 21, 2026",
        method: "text",
      });
      await newerExtraction.promise;
    });
    expect(await screen.findByText("Pay $88.00")).toBeInTheDocument();

    await act(async () => {
      olderExtraction.resolve({
        text: "Amount due: $11.00\nDue date: August 1, 2026",
        method: "text",
      });
      await olderExtraction.promise;
    });

    expect(screen.getByLabelText(/Paste the notice/i)).toHaveValue(
      "Amount due: $88.00\nDue date: August 21, 2026",
    );
    expect(screen.getByText("Pay $88.00")).toBeInTheDocument();
    expect(screen.queryByText("Pay $11.00")).not.toBeInTheDocument();
    expect(screen.getByText(/newer\.txt read locally/i)).toBeInTheDocument();
  });

  it("does not let a stale file error replace the current file state", async () => {
    const olderExtraction = deferredValue<{ text: string; method: "text" }>();
    mocks.extractDocument
      .mockReturnValueOnce(olderExtraction.promise)
      .mockResolvedValueOnce({
        text: "Amount due: $77.00\nDue date: August 22, 2026",
        method: "text",
      });
    render(<LifeOpsApp />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    fireEvent.change(input!, {
      target: { files: [new File(["older"], "older.txt", { type: "text/plain" })] },
    });
    fireEvent.change(input!, {
      target: { files: [new File(["newer"], "newer.txt", { type: "text/plain" })] },
    });
    expect(await screen.findByText("Pay $77.00")).toBeInTheDocument();

    await act(async () => {
      olderExtraction.reject(new Error("stale extraction failed"));
      await expect(olderExtraction.promise).rejects.toThrow("stale extraction failed");
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/newer\.txt read locally/i)).toBeInTheDocument();
    expect(screen.getByText("Pay $77.00")).toBeInTheDocument();
  });

  it("uses the current date for pasted text but the fixed demo date for built-in samples", async () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    render(<LifeOpsApp />);

    fireEvent.change(screen.getByLabelText(/Paste the notice/i), {
      target: { value: "Amount due: $42.00\nDue date: July 14, 2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Get next actions/i }));

    const pastedAction = screen.getByText("Pay $42.00");
    expect(pastedAction.closest(".action-lane")).toHaveClass("action-lane--later");

    fireEvent.click(screen.getByRole("button", { name: /Genesis hackathon deadlines/i }));
    const sampleAction = screen.getByText("Complete internal qa deadline");
    expect(sampleAction.closest(".action-lane")).toHaveClass("action-lane--soon");
  });

  it("shows an explicit PST time unchanged in both the fact and action displays", async () => {
    render(<LifeOpsApp />);
    fireEvent.change(screen.getByLabelText(/Paste the notice/i), {
      target: {
        value: "Departs: San Francisco (SFO) — Aug 18, 2026 at 10:30 PM PST",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /Get next actions/i }));

    expect(await screen.findByText("Aug 18, 2026, 10:30 PM PST")).toBeInTheDocument();
    expect(screen.getByText("Aug 18, 10:30 PM PST")).toBeInTheDocument();
  });

  it("shows the second original PDF page for the second identical quote", async () => {
    const source = pdfSourceWithSecondQuoteRuns();
    await uploadPdf(source);
    await waitFor(() => {
      expect(screen.getByRole("figure", { name: /Original PDF page 1 of 2/i })).toHaveAttribute(
        "data-render-state",
        "ready",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /^Amount due: \$42\.00$/i }));

    const figure = await screen.findByRole("figure", {
      name: /Original PDF page 2 of 2/i,
    });
    expect(figure).toHaveAttribute("data-page-number", "2");
    expect(figure).toHaveAccessibleDescription(
      /Selected evidence: \$42\.00\. Same-page source context: \$42\.00 Due date: July 14, 2026/i,
    );
    expect(screen.getByTestId("pdf-evidence-overlay")).toHaveAttribute(
      "data-evidence-start",
      String(pdfText.lastIndexOf("$42.00")),
    );
    expect(screen.queryByTestId("selected-evidence")).not.toBeInTheDocument();
    expect(mocks.getDocument).toHaveBeenCalledTimes(1);
  });

  it("describes marker-like evidence with exact quote and same-page run context", () => {
    const sourceText = [
      "[Page 1]",
      "Nearby page-one context",
      "Selected token: [Page 1]",
      "Page-one trailing context",
      "",
      "[Page 2]",
      "UNRELATED PAGE TWO TEXT",
    ].join("\n");
    const quote = "[Page 1]";
    const evidenceStart = sourceText.lastIndexOf(quote);
    const pageOneStart = sourceText.indexOf("Nearby page-one context");
    const pageOneEnd = sourceText.indexOf("\n\n[Page 2]");
    const pageTwoStart = sourceText.indexOf("UNRELATED PAGE TWO TEXT");
    const file = new File(["pdf"], "marker-like-evidence.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "arrayBuffer", {
      configurable: true,
      value: vi.fn().mockResolvedValue(new TextEncoder().encode("pdf").buffer),
    });
    const source: PdfDocumentSource = {
      file,
      map: {
        sourceText,
        pageCount: 2,
        pages: [
          { pageNumber: 1, width: 612, height: 792, rotation: 0 },
          { pageNumber: 2, width: 612, height: 792, rotation: 0 },
        ],
        runs: [
          {
            start: pageOneStart,
            end: pageOneEnd,
            pageNumber: 1,
            rotation: 0,
            rect: { left: 0.1, top: 0.2, width: 0.5, height: 0.1 },
          },
          {
            start: pageTwoStart,
            end: sourceText.length,
            pageNumber: 2,
            rotation: 0,
            rect: { left: 0.1, top: 0.2, width: 0.5, height: 0.1 },
          },
        ],
      },
    };
    const locator: PdfEvidenceLocator = {
      pageNumber: 1,
      pageCount: 2,
      pageWidth: 612,
      pageHeight: 792,
      evidenceStart,
      rects: [{ left: 0.2, top: 0.3, width: 0.2, height: 0.05 }],
    };

    render(
      <PdfEvidencePreview
        source={source}
        locator={locator}
        quote={quote}
        onUnavailable={vi.fn()}
        onEvidenceElement={vi.fn()}
      />,
    );

    const figure = screen.getByRole("figure", { name: /Original PDF page 1 of 2/i });
    expect(figure).toHaveAccessibleDescription(
      /Selected evidence: \[Page 1\]\. Same-page source context: Nearby page-one context Selected token: \[Page 1\] Page-one trailing context/i,
    );
    expect(figure).not.toHaveAccessibleDescription(/UNRELATED PAGE TWO TEXT/i);
  });

  it("keeps rapid page switches loading until the latest page owns the canvas", async () => {
    const secondPageRender = deferred();
    const returnToFirstPageRender = deferred();
    const renders: Array<{
      pageNumber: number;
      canvas: HTMLCanvasElement;
      cancel: ReturnType<typeof vi.fn>;
    }> = [];
    let firstPageRenderCount = 0;
    mocks.getDocument.mockImplementation(() => ({
      destroy: vi.fn().mockResolvedValue(undefined),
      promise: Promise.resolve({
        numPages: 2,
        getPage: async (pageNumber: number) => ({
          getViewport: ({ scale }: { scale: number }) => ({
            width: 612 * scale,
            height: 792 * scale,
            rotation: 0,
          }),
          render: ({ canvas }: { canvas: HTMLCanvasElement }) => {
            const cancel = vi.fn();
            renders.push({ pageNumber, canvas, cancel });
            const promise = pageNumber === 2
              ? secondPageRender.promise
              : firstPageRenderCount++ === 0
                ? Promise.resolve()
                : returnToFirstPageRender.promise;
            return { promise, cancel };
          },
        }),
      }),
    }));
    await uploadPdf(pdfSourceWithSecondQuoteRuns());
    await waitFor(() => {
      expect(screen.getByRole("figure", { name: /Original PDF page 1 of 2/i })).toHaveAttribute(
        "data-render-state",
        "ready",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /^Amount due: \$42\.00$/i }));
    await waitFor(() => expect(renders.some((rendered) => rendered.pageNumber === 2)).toBe(true));
    const obsoleteRender = renders.find((rendered) => rendered.pageNumber === 2)!;

    fireEvent.click(screen.getByRole("button", { name: /^Amount: \$42\.00$/i }));
    await waitFor(() => {
      expect(renders.filter((rendered) => rendered.pageNumber === 1)).toHaveLength(2);
    });
    const currentFigure = screen.getByRole("figure", { name: /Original PDF page 1 of 2/i });
    expect(currentFigure).toHaveAttribute("data-render-state", "loading");
    expect(obsoleteRender.cancel).toHaveBeenCalledOnce();
    expect(obsoleteRender.canvas).not.toBe(currentFigure.querySelector("canvas"));

    await act(async () => {
      secondPageRender.resolve();
      await secondPageRender.promise;
    });
    expect(currentFigure).toHaveAttribute("data-render-state", "loading");

    await act(async () => {
      returnToFirstPageRender.resolve();
      await returnToFirstPageRender.promise;
    });
    expect(currentFigure).toHaveAttribute("data-render-state", "ready");
  });

  it("does not reuse a loaded document for a distinct map backed by the same File", async () => {
    const firstSource = pdfSourceWithSecondQuoteRuns();
    const replacementSource = {
      ...pdfSourceWithSecondQuoteRuns(),
      file: firstSource.file,
    };
    expect(replacementSource.map).not.toBe(firstSource.map);
    const firstAmount = pdfText.indexOf("$42.00");
    const locator: PdfEvidenceLocator = {
      pageNumber: 1,
      pageCount: 2,
      pageWidth: 612,
      pageHeight: 792,
      evidenceStart: firstAmount,
      rects: [{ left: 0.12, top: 0.2, width: 0.15, height: 0.05 }],
    };
    const firstDestroy = vi.fn().mockResolvedValue(undefined);
    mocks.getDocument
      .mockImplementationOnce(() => ({
        destroy: firstDestroy,
        promise: Promise.resolve({
          numPages: 2,
          getPage: async () => ({
            getViewport: () => ({ width: 612, height: 792, rotation: 0 }),
            render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        destroy: vi.fn().mockResolvedValue(undefined),
        promise: new Promise(() => undefined),
      }));
    const { rerender } = render(
      <PdfEvidencePreview
        source={firstSource}
        locator={locator}
        quote="$42.00"
        onUnavailable={vi.fn()}
        onEvidenceElement={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("figure", { name: /Original PDF page 1 of 2/i })).toHaveAttribute(
        "data-render-state",
        "ready",
      );
    });
    const firstCanvas = screen
      .getByRole("figure", { name: /Original PDF page 1 of 2/i })
      .querySelector("canvas");

    rerender(
      <PdfEvidencePreview
        source={replacementSource}
        locator={locator}
        quote="$42.00"
        onUnavailable={vi.fn()}
        onEvidenceElement={vi.fn()}
      />,
    );
    await waitFor(() => expect(mocks.getDocument).toHaveBeenCalledTimes(2));
    expect(firstDestroy).toHaveBeenCalledOnce();

    const replacementFigure = screen.getByRole("figure", {
      name: /Original PDF page 1 of 2/i,
    });
    expect(replacementFigure).toHaveAttribute("data-render-state", "loading");
    expect(replacementFigure.querySelector("canvas")).not.toBe(firstCanvas);
  });

  it("destroys the PDF loading task and absorbs cleanup rejection", async () => {
    const source = pdfSourceWithSecondQuoteRuns();
    const firstAmount = pdfText.indexOf("$42.00");
    const locator: PdfEvidenceLocator = {
      pageNumber: 1,
      pageCount: 2,
      pageWidth: 612,
      pageHeight: 792,
      evidenceStart: firstAmount,
      rects: [{ left: 0.12, top: 0.2, width: 0.15, height: 0.05 }],
    };
    const destroy = vi.fn().mockRejectedValue(new Error("destroy rejected"));
    mocks.getDocument.mockReturnValue({
      destroy,
      promise: new Promise(() => undefined),
    });
    const { unmount } = render(
      <PdfEvidencePreview
        source={source}
        locator={locator}
        quote="$42.00"
        onUnavailable={vi.fn()}
        onEvidenceElement={vi.fn()}
      />,
    );
    await waitFor(() => expect(mocks.getDocument).toHaveBeenCalledOnce());

    unmount();
    await act(async () => {
      await Promise.resolve();
    });

    expect(destroy).toHaveBeenCalledOnce();
  });

  it.each<Array<[
    string,
    (runs: PdfGeometryRun[], selected: PdfGeometryRun) => PdfGeometryRun[],
  ]>>([
    ["malformed", (runs, selected) => runs.map((run) => (
      run === selected ? { ...run, rect: { ...run.rect, width: 0 } } : run
    ))],
    ["rotated", (runs, selected) => runs.map((run) => (
      run === selected ? { ...run, rotation: 90 } : run
    ))],
    ["incomplete", (runs, selected) => runs.map((run) => (
      run === selected ? { ...run, end: run.end - 1 } : run
    ))],
    ["cross-page", (runs, selected) => runs.flatMap((run) => (
      run === selected
        ? [
            { ...run, end: run.start + 3 },
            { ...run, start: run.start + 3, pageNumber: 1 },
          ]
        : [run]
    ))],
    ["duplicate", (runs, selected) => [
      ...runs,
      { ...selected, rect: { ...selected.rect, left: selected.rect.left + 0.01 } },
    ]],
  ])("keeps the text-only proof for %s selected geometry", async (_name, mutate) => {
    const secondStart = pdfText.lastIndexOf("$42.00");
    const source = pdfSourceWithSecondQuoteRuns((runs) => {
      const selected = runs.find((run) => run.start === secondStart)!;
      return mutate(runs, selected);
    });
    await uploadPdf(source);

    fireEvent.click(screen.getByRole("button", { name: /^Amount due: \$42\.00$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("figure", { name: /Original PDF page/i })).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("selected-evidence")).toHaveTextContent("$42.00");
  });

  it("returns to the text-only proof when the original page cannot render", async () => {
    mocks.getDocument.mockImplementation(() => ({
      destroy: vi.fn().mockResolvedValue(undefined),
      promise: Promise.resolve({
        numPages: 2,
        getPage: async () => ({
          getViewport: () => ({ width: 612, height: 792, rotation: 0 }),
          render: () => ({
            promise: Promise.reject(new Error("render failed")),
            cancel: vi.fn(),
          }),
        }),
      }),
    }));
    await uploadPdf(pdfSourceWithSecondQuoteRuns());
    fireEvent.click(screen.getByRole("button", { name: /^Amount due: \$42\.00$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("figure", { name: /Original PDF page/i })).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("selected-evidence")).toHaveTextContent("$42.00");
  });

  it("retries a failed preview for a distinct same-metadata PDF source", async () => {
    const failedSource = pdfSourceWithSecondQuoteRuns();
    const replacementSource = pdfSourceWithSecondQuoteRuns();
    expect(replacementSource.file).not.toBe(failedSource.file);
    expect([
      replacementSource.file.name,
      replacementSource.file.size,
      replacementSource.file.lastModified,
    ]).toEqual([
      failedSource.file.name,
      failedSource.file.size,
      failedSource.file.lastModified,
    ]);
    mocks.getDocument
      .mockImplementationOnce(() => ({
        destroy: vi.fn().mockResolvedValue(undefined),
        promise: Promise.resolve({
          numPages: 2,
          getPage: async () => ({
            getViewport: () => ({ width: 612, height: 792, rotation: 0 }),
            render: () => ({
              promise: Promise.reject(new Error("first source render failed")),
              cancel: vi.fn(),
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        destroy: vi.fn().mockResolvedValue(undefined),
        promise: Promise.resolve({
          numPages: 2,
          getPage: async () => ({
            getViewport: () => ({ width: 612, height: 792, rotation: 0 }),
            render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        destroy: vi.fn().mockResolvedValue(undefined),
        promise: Promise.resolve({
          numPages: 2,
          getPage: async () => ({
            getViewport: () => ({ width: 612, height: 792, rotation: 0 }),
            render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
          }),
        }),
      }));

    await uploadPdf(failedSource);
    await waitFor(() => {
      expect(screen.queryByRole("figure", { name: /Original PDF page/i })).not.toBeInTheDocument();
    });

    await uploadPdfIntoCurrentApp(replacementSource);

    await waitFor(() => {
      expect(screen.getByRole("figure", { name: /Original PDF page 1 of 2/i })).toHaveAttribute(
        "data-render-state",
        "ready",
      );
    });
    expect(mocks.getDocument).toHaveBeenCalledTimes(2);

    await uploadPdfIntoCurrentApp(failedSource);

    await waitFor(() => {
      expect(screen.getByRole("figure", { name: /Original PDF page 1 of 2/i })).toHaveAttribute(
        "data-render-state",
        "ready",
      );
    });
    expect(mocks.getDocument).toHaveBeenCalledTimes(3);
  });

  it("keeps OCR results on the text-only proof path", async () => {
    const image = new File(["image"], "notice.png", { type: "image/png" });
    const text = "Amount due: $42.00\nDue date: July 14, 2026";
    mocks.extractDocument.mockResolvedValueOnce({ text, method: "ocr" });
    render(<LifeOpsApp />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    fireEvent.change(input!, { target: { files: [image] } });
    await screen.findByText(/notice\.png read locally · OCR extraction complete/i);
    fireEvent.click(screen.getByRole("button", { name: /^Amount due: \$42\.00$/i }));

    expect(screen.queryByRole("figure", { name: /Original PDF page/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("selected-evidence")).toHaveTextContent("$42.00");
  });

  it("clears retained PDF context when a built-in sample replaces the document", async () => {
    await uploadPdf(pdfSourceWithSecondQuoteRuns());
    fireEvent.click(screen.getByRole("button", { name: /^Amount due: \$42\.00$/i }));
    expect(await screen.findByRole("figure", { name: /Original PDF page 2 of 2/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Overdue renewal bill/i }));
    fireEvent.click(screen.getByRole("button", { name: /Amount due.*\$184\.62/i }));

    expect(screen.queryByRole("figure", { name: /Original PDF page/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("selected-evidence")).toHaveTextContent("$184.62");
  });
});

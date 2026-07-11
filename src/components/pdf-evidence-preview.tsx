"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import type {
  PdfDocumentSource,
  PdfEvidenceLocator,
  PdfSourceMap,
} from "@/lib/pdf-source-locator";
import { loadPdfJs } from "@/lib/pdfjs";

type PdfEvidencePreviewProps = {
  source: PdfDocumentSource;
  locator: PdfEvidenceLocator;
  quote: string;
  onUnavailable: () => void;
  onEvidenceElement: (element: HTMLDivElement | null) => void;
};

function getSourceContext(
  source: PdfDocumentSource,
  locator: PdfEvidenceLocator,
  quote: string,
) {
  const sourceText = source.map.sourceText;
  const evidenceEnd = Math.min(sourceText.length, locator.evidenceStart + quote.length);
  const pageRuns = source.map.runs.filter((run) => (
    run.pageNumber === locator.pageNumber
    && Number.isInteger(run.start)
    && Number.isInteger(run.end)
    && run.start >= 0
    && run.end > run.start
    && run.end <= sourceText.length
  ));
  const runStart = pageRuns.length
    ? Math.min(...pageRuns.map((run) => run.start))
    : locator.evidenceStart;
  const runEnd = pageRuns.length
    ? Math.max(...pageRuns.map((run) => run.end))
    : evidenceEnd;
  const boundsCoverEvidence = runStart <= locator.evidenceStart && runEnd >= evidenceEnd;
  const pageStart = boundsCoverEvidence ? runStart : locator.evidenceStart;
  const pageEnd = boundsCoverEvidence ? runEnd : evidenceEnd;
  const contextStart = Math.max(pageStart, locator.evidenceStart - 120);
  const contextEnd = Math.min(pageEnd, evidenceEnd + 160);

  return sourceText
    .slice(contextStart, contextEnd)
    .replace(/\s+/g, " ")
    .trim();
}

export function PdfEvidencePreview({
  source,
  locator,
  quote,
  onUnavailable,
  onEvidenceElement,
}: PdfEvidencePreviewProps) {
  const captionId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onUnavailableRef = useRef(onUnavailable);
  const [renderState, setRenderState] = useState({
    sourceMap: source.map,
    pageNumber: locator.pageNumber,
    evidenceStart: locator.evidenceStart,
    requestId: 1,
    ready: false,
  });
  const renderTargetChanged = renderState.sourceMap !== source.map
    || renderState.pageNumber !== locator.pageNumber
    || renderState.evidenceStart !== locator.evidenceStart;
  const renderRequestId = renderTargetChanged
    ? renderState.requestId + 1
    : renderState.requestId;
  if (renderTargetChanged) {
    setRenderState({
      sourceMap: source.map,
      pageNumber: locator.pageNumber,
      evidenceStart: locator.evidenceStart,
      requestId: renderRequestId,
      ready: false,
    });
  }
  const [loadedPdf, setLoadedPdf] = useState<{
    sourceMap: PdfSourceMap;
    document: PDFDocumentProxy;
  } | null>(null);
  const loadedSourceChanged = Boolean(
    loadedPdf && loadedPdf.sourceMap !== source.map,
  );
  if (loadedSourceChanged) setLoadedPdf(null);
  const document = !loadedSourceChanged && loadedPdf?.sourceMap === source.map
    ? loadedPdf.document
    : null;
  const union = useMemo(() => {
    const left = Math.min(...locator.rects.map((rect) => rect.left));
    const top = Math.min(...locator.rects.map((rect) => rect.top));
    const right = Math.max(...locator.rects.map((rect) => rect.left + rect.width));
    const bottom = Math.max(...locator.rects.map((rect) => rect.top + rect.height));
    return { left, top, width: right - left, height: bottom - top };
  }, [locator.rects]);
  const sourceContext = useMemo(
    () => getSourceContext(source, locator, quote),
    [locator, quote, source],
  );

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;

    void (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const data = await source.file.arrayBuffer();
        if (cancelled) return;
        loadingTask = pdfjs.getDocument({ data });
        const loadedDocument = await loadingTask.promise;
        if (cancelled) return;
        if (loadedDocument.numPages !== source.map.pageCount) {
          onUnavailableRef.current();
          return;
        }
        setLoadedPdf({
          sourceMap: source.map,
          document: loadedDocument,
        });
      } catch {
        if (!cancelled) onUnavailableRef.current();
      }
    })();

    return () => {
      cancelled = true;
      if (loadingTask) void loadingTask.destroy().catch(() => undefined);
    };
  }, [source.file, source.map]);

  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    let renderTask: RenderTask | undefined;

    void (async () => {
      try {
        if (locator.pageNumber > document.numPages) {
          onUnavailableRef.current();
          return;
        }
        const page = await document.getPage(locator.pageNumber);
        const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2) * 1.35;
        const viewport = page.getViewport({ scale });
        if (viewport.rotation !== 0 || cancelled || !canvasRef.current) {
          if (!cancelled && viewport.rotation !== 0) onUnavailableRef.current();
          return;
        }
        const canvas = canvasRef.current;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvas, viewport });
        await renderTask.promise;
        if (!cancelled) {
          setRenderState((current) => current.requestId === renderRequestId
            ? { ...current, ready: true }
            : current);
        }
      } catch {
        if (!cancelled) onUnavailableRef.current();
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, locator.pageNumber, renderRequestId]);

  const ready = !renderTargetChanged && renderState.ready;

  return (
    <div className="pdf-page-shell">
      <figure
        className="pdf-page-surface"
        aria-label={`Original PDF page ${locator.pageNumber} of ${locator.pageCount}`}
        aria-describedby={captionId}
        aria-busy={!ready}
        data-testid="pdf-page-surface"
        data-page-number={locator.pageNumber}
        data-page-count={locator.pageCount}
        data-render-state={ready ? "ready" : "loading"}
        style={{ aspectRatio: `${locator.pageWidth} / ${locator.pageHeight}` }}
      >
        <canvas key={renderRequestId} ref={canvasRef} aria-hidden="true" />
        {!ready ? <span className="pdf-page-loading">Rendering original page…</span> : null}
        {locator.rects.map((rect, index) => (
          <span
            aria-hidden="true"
            className="pdf-evidence-highlight"
            data-testid="pdf-evidence-highlight"
            key={`${rect.left}:${rect.top}:${index}`}
            style={{
              left: `${rect.left * 100}%`,
              top: `${rect.top * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
            }}
          />
        ))}
        <div
          ref={onEvidenceElement}
          aria-hidden="true"
          className="pdf-evidence-overlay"
          data-testid="pdf-evidence-overlay"
          data-evidence-start={locator.evidenceStart}
          style={{
            left: `${union.left * 100}%`,
            top: `${union.top * 100}%`,
            width: `${union.width * 100}%`,
            height: `${union.height * 100}%`,
          }}
        />
        <figcaption className="visually-hidden" id={captionId}>
          Selected evidence: {quote}. Same-page source context: {sourceContext || quote}
        </figcaption>
      </figure>
    </div>
  );
}

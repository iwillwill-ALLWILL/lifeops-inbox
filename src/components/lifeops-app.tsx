"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  FileImage,
  FileText,
  Fingerprint,
  Highlighter,
  ImageDown,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  ReceiptText,
  ScanText,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { analyzeDocument } from "@/core/analyze";
import { createIcs } from "@/core/ics";
import { toShareSummary } from "@/core/redact";
import { DEMO_SAMPLES } from "@/core/samples";
import type { Analysis, Fact } from "@/core/schema";
import { extractDocument } from "@/lib/extract-document";
import { confidenceMeta, createShareCardSvg, formatDueAt, formatFactValue, segmentSource } from "@/lib/presentation";

const SAMPLE_REFERENCE_DATE = new Date("2026-07-11T12:00:00Z");

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function FactGlyph({ fact }: { fact: Fact }) {
  if (fact.kind === "date") return <CalendarDays aria-hidden="true" />;
  if (fact.kind === "amount") return <ReceiptText aria-hidden="true" />;
  if (fact.kind === "location") return <MapPin aria-hidden="true" />;
  if (fact.kind === "reference") return <Fingerprint aria-hidden="true" />;
  return <FileText aria-hidden="true" />;
}

function IntakePanel({
  text,
  setText,
  onAnalyze,
  onSample,
  onFile,
  error,
  status,
  busy,
  progress,
}: {
  text: string;
  setText: (value: string) => void;
  onAnalyze: () => void;
  onSample: (sample: (typeof DEMO_SAMPLES)[number]) => void;
  onFile: (file: File) => void;
  error: string;
  status: string;
  busy: boolean;
  progress: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="intake" aria-labelledby="intake-title">
      <div className="intake__bar">
        <div>
          <span className="section-kicker">01 / Intake</span>
          <h2 id="intake-title">What landed in your inbox?</h2>
        </div>
        <div className="privacy-inline"><LockKeyhole aria-hidden="true" /> Parsed in this browser</div>
      </div>

      <div className="intake__grid">
        <div className="paste-field">
          <label htmlFor="document-text">Paste the notice</label>
          <textarea
            id="document-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"Paste a bill, itinerary, school note, event confirmation…\n\nLifeOps will only use what is actually written."}
            spellCheck="false"
          />
          <div className="field-footer">
            <span>{text.length.toLocaleString()} characters</span>
            <span>Nothing saved</span>
          </div>
        </div>

        <div className="upload-stack">
          <button
            className="drop-button"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            <span>
              <strong>{busy ? "Reading locally…" : "Choose a document"}</strong>
              <small>TXT, PDF, PNG, JPG, WEBP</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept=".txt,.pdf,.png,.jpg,.jpeg,.webp,text/plain,application/pdf,image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.currentTarget.value = "";
            }}
          />
          {busy && progress > 0 ? (
            <div className="progress-track" aria-label={`OCR ${Math.round(progress * 100)} percent complete`}>
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          ) : null}
          <div className="format-note">
            <FileText aria-hidden="true" /> PDF text stays on-device
            <span />
            <FileImage aria-hidden="true" /> Images use optional on-device OCR
          </div>
        </div>
      </div>

      <div className="sample-strip">
        <div className="sample-strip__label">
          <Sparkles aria-hidden="true" /> Try a real scenario
        </div>
        <div className="sample-list">
          {DEMO_SAMPLES.map((sample, index) => (
            <button key={sample.id} type="button" onClick={() => onSample(sample)}>
              <span className="sample-number">0{index + 1}</span>
              <span>
                <small>{sample.eyebrow}</small>
                <strong>{sample.title}</strong>
              </span>
              <ArrowRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <div className="intake__action-row">
        <div aria-live="polite">
          {error ? <p className="inline-error" role="alert"><CircleAlert aria-hidden="true" /> {error}</p> : null}
          {!error && status ? <p className="inline-success"><Check aria-hidden="true" /> {status}</p> : null}
        </div>
        <button className="primary-button" type="button" onClick={onAnalyze} disabled={busy}>
          {busy ? "Reading document" : "Get next actions"}
          <ArrowDown aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function ResultWorkbench({ analysis }: { analysis: Analysis }) {
  const [selectedFactId, setSelectedFactId] = useState(analysis.facts[0]?.id);
  const evidenceRef = useRef<HTMLElement>(null);
  const selectedFact = analysis.facts.find((fact) => fact.id === selectedFactId);
  const segments = useMemo(
    () => segmentSource(analysis.sourceText, selectedFact?.evidence),
    [analysis.sourceText, selectedFact],
  );
  useEffect(() => {
    if (!selectedFactId) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    evidenceRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
    });
  }, [selectedFactId]);
  const confidence = confidenceMeta(analysis.confidence);
  const exceptionCount = analysis.conflicts.length + analysis.uncertainties.length;
  const lanes = [
    { id: "now", label: "Now", note: "Due or overdue", tone: "urgent" },
    { id: "this-week", label: "This week", note: "Next seven days", tone: "soon" },
    { id: "waiting", label: "Waiting", note: "Later or dependent", tone: "later" },
  ] as const;

  const downloadCalendar = () =>
    downloadText("lifeops-plan.ics", createIcs(analysis), "text/calendar;charset=utf-8");
  const downloadShare = () =>
    downloadText(
      "lifeops-before-after.svg",
      createShareCardSvg(toShareSummary(analysis)),
      "image/svg+xml;charset=utf-8",
    );

  return (
    <motion.section
      className="workbench"
      aria-labelledby="result-title"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="result-head">
        <div className="result-head__title">
          <span className="section-kicker">02 / Execution brief</span>
          <h2 id="result-title">{analysis.title}</h2>
          <div className="result-meta">
            <span className={`confidence confidence--${confidence.tone}`}><i /> {confidence.label} confidence · {Math.round(analysis.confidence * 100)}%</span>
            <span>{analysis.facts.length} cited facts</span>
            <span>{analysis.actions.length} next actions</span>
            <span>{exceptionCount} to review</span>
          </div>
        </div>
        <div className="export-actions">
          <button type="button" onClick={downloadCalendar} disabled={!analysis.actions.some((action) => action.dueAt)}>
            <CalendarDays aria-hidden="true" /> Calendar <Download aria-hidden="true" />
          </button>
          <button type="button" onClick={downloadShare}>
            <ImageDown aria-hidden="true" /> Safe share card <Download aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="proof-grid">
        <section className="source-pane" aria-labelledby="source-heading">
          <div className="pane-heading">
            <div><span>Source</span><h3 id="source-heading">Original text</h3></div>
            <div className="proof-badge"><Highlighter aria-hidden="true" /> Proof trail</div>
          </div>
          <pre className="source-text">
            {segments.map((segment, index) =>
              segment.highlighted ? (
                <mark ref={evidenceRef} key={index} data-testid="selected-evidence">{segment.text}</mark>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </pre>
          <p className="source-note"><ShieldCheck aria-hidden="true" /> Select a fact to verify its exact source words.</p>
        </section>

        <section className="fact-pane" aria-labelledby="facts-heading">
          <div className="pane-heading">
            <div><span>Extracted</span><h3 id="facts-heading">Fact ledger</h3></div>
            <span className="ledger-count">{analysis.facts.length}</span>
          </div>
          <div className="fact-list">
            {analysis.facts.map((fact) => (
              <button
                key={fact.id}
                type="button"
                className={fact.id === selectedFactId ? "fact-row fact-row--active" : "fact-row"}
                onClick={() => setSelectedFactId(fact.id)}
                aria-label={`${fact.label}: ${fact.value}`}
              >
                <span className="fact-icon"><FactGlyph fact={fact} /></span>
                <span className="fact-main">
                  <small>{fact.label}</small>
                  <strong>{formatFactValue(fact)}</strong>
                  {fact.normalizedValue && fact.normalizedValue !== fact.value ? <em>Source: “{fact.value}”</em> : null}
                </span>
                <span className="fact-score">{Math.round(fact.confidence * 100)}%</span>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="action-section" aria-labelledby="actions-heading">
        <div className="section-heading-row">
          <div><span className="section-kicker">03 / Action board</span><h2 id="actions-heading">Move the right things forward.</h2></div>
          <p>Timing comes from the cited dates above—not from a generated guess.</p>
        </div>
        <div className="action-board">
          {lanes.map((lane) => {
            const actions = analysis.actions.filter((action) => action.lane === lane.id);
            return (
              <div className={`action-lane action-lane--${lane.tone}`} key={lane.id}>
                <div className="lane-head"><span><i /> {lane.label}</span><small>{lane.note}</small><b>{actions.length}</b></div>
                <div className="lane-list">
                  {actions.length ? actions.map((action, index) => {
                    const actionDate = action.sourceFactIds
                      .map((factId) => analysis.facts.find((fact) => fact.id === factId)?.date)
                      .find(Boolean);
                    return (
                    <motion.article
                      key={action.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="action-check"><Check aria-hidden="true" /></div>
                      <div>
                        <h3>{action.title}</h3>
                        {action.detail ? <p>{action.detail}</p> : null}
                        {action.dueAt ? <time dateTime={action.dueAt}><Clock3 aria-hidden="true" /> {formatDueAt(action.dueAt, actionDate?.timezone, action.dateOnly, actionDate?.timezoneAbbreviation)}</time> : <span className="no-date">Date needs confirmation</span>}
                      </div>
                    </motion.article>
                    );
                  }) : <div className="lane-empty">Nothing here yet</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="exceptions" aria-labelledby="exceptions-heading">
        <div className="exceptions__heading">
          <span className="section-kicker">04 / Review before acting</span>
          <h2 id="exceptions-heading">{exceptionCount ? `${exceptionCount} details deserve a second look.` : "No conflicts detected."}</h2>
        </div>
        <div className="exception-list">
          {analysis.conflicts.map((conflict) => (
            <article className="exception-row exception-row--conflict" key={conflict.id}>
              <CircleAlert aria-hidden="true" /><div><small>Conflict</small><p>{conflict.message}</p></div>
            </article>
          ))}
          {analysis.uncertainties.map((uncertainty) => (
            <article className="exception-row" key={uncertainty.id}>
              <ScanText aria-hidden="true" /><div><small>{uncertainty.severity === "warning" ? "Verify" : "Handled safely"}</small><p>{uncertainty.message}</p></div>
            </article>
          ))}
          {!exceptionCount ? <p className="all-clear"><Check aria-hidden="true" /> Extracted dates and values are internally consistent.</p> : null}
        </div>
      </section>
    </motion.section>
  );
}

export function LifeOpsApp() {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const runAnalysis = (
    value = text,
    nextStatus = "Execution brief ready",
    referenceDate = new Date(),
  ) => {
    if (!value.trim()) {
      setError("Paste a notice or choose a sample to get started.");
      setStatus("");
      return;
    }
    try {
      const result = analyzeDocument(value, { referenceDate });
      setAnalysis(result);
      setError("");
      setStatus(nextStatus);
      requestAnimationFrame(() => {
        document.getElementById("result-title")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      });
    } catch {
      setError("We could not find usable text. Check the document and try again.");
      setAnalysis(null);
    }
  };

  const handleSample = (sample: (typeof DEMO_SAMPLES)[number]) => {
    setText(sample.text);
    runAnalysis(
      sample.text,
      "Built-in sample loaded · parsed by the real analysis core",
      SAMPLE_REFERENCE_DATE,
    );
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setProgress(0);
    setError("");
    setStatus(`Reading ${file.name} locally…`);
    try {
      const result = await extractDocument(file, undefined, (value) => setProgress(value));
      setText(result.text);
      runAnalysis(result.text, `${file.name} read locally · ${result.method.toUpperCase()} extraction complete`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This file could not be read.");
      setStatus("");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="LifeOps Inbox home"><span className="brand-mark"><Layers3 /></span><span>LifeOps <b>Inbox</b></span></a>
        <nav aria-label="Page links"><a href="#workspace">Workspace</a><a href="#proof">Why it works</a></nav>
        <div className="header-trust"><span className="pulse-dot" /> Local-first</div>
      </header>

      <section className="hero" id="top">
        <div className="hero__copy">
          <div className="hero-eyebrow"><span>Life admin, finally executable</span><i /></div>
          <h1>Drop the paperwork.<br /><em>Get the next actions.</em></h1>
          <p>Bills, travel confirmations, official notices—turned into cited facts, clear deadlines, and a plan you can actually use.</p>
          <a href="#workspace" className="hero-link">Open the workspace <ArrowDown aria-hidden="true" /></a>
        </div>
        <div className="hero__proof" aria-label="Product principles">
          <div className="proof-index">00</div>
          <div className="proof-line"><span>Input</span><strong>Paperwork</strong><FileText aria-hidden="true" /></div>
          <div className="proof-connector"><i /><ArrowDown aria-hidden="true" /></div>
          <div className="proof-line proof-line--accent"><span>Output</span><strong>Execution plan</strong><Check aria-hidden="true" /></div>
          <p><ShieldCheck aria-hidden="true" /> Source-backed. Private by default.</p>
        </div>
      </section>

      <div className="trust-rail"><span>No account</span><i /><span>No API key</span><i /><span>No upload required</span><i /><span>Works with your text</span></div>

      <div className="workspace-shell" id="workspace">
        <IntakePanel
          text={text}
          setText={setText}
          onAnalyze={() => runAnalysis()}
          onSample={handleSample}
          onFile={handleFile}
          error={error}
          status={status}
          busy={busy}
          progress={progress}
        />
        <AnimatePresence mode="wait">
          {analysis ? <ResultWorkbench key={`${analysis.title}-${analysis.sourceText.length}`} analysis={analysis} /> : null}
        </AnimatePresence>
      </div>

      <section className="judge-proof" id="proof">
        <div className="judge-proof__intro">
          <span className="section-kicker">Built for decisions, not demos</span>
          <h2>This is not generic OCR with a summary box.</h2>
          <p>Every output has to survive four product tests before it earns space on the screen.</p>
        </div>
        <div className="judge-grid">
          {[
            { icon: Highlighter, number: "01", title: "Provenance", body: "Every fact links to the exact source span. Click it. Verify it." },
            { icon: CircleAlert, number: "02", title: "Conflict radar", body: "Contradictory deadlines remain visible instead of being averaged away." },
            { icon: LockKeyhole, number: "03", title: "Private by design", body: "Parsing happens in-browser. Share output strips identifiers and source quotes." },
            { icon: CalendarDays, number: "04", title: "Executable", body: "Actions become a real calendar file—not a paragraph you still have to process." },
          ].map((item) => (
            <article key={item.number}><span>{item.number}</span><item.icon aria-hidden="true" /><h3>{item.title}</h3><p>{item.body}</p></article>
          ))}
        </div>
      </section>

      <footer><a className="brand brand--footer" href="#top"><span className="brand-mark"><Layers3 /></span><span>LifeOps <b>Inbox</b></span></a><p>Paperwork in. Life moving.</p><span>Genesis Hackathon MVP · 2026</span></footer>
    </main>
  );
}

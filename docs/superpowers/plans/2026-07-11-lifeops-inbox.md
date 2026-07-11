# LifeOps Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a competition-ready, local-first Next.js MVP that converts pasted or client-extracted paperwork into evidence-backed facts, actions, exceptions, and safe exports.

**Architecture:** A pure TypeScript analysis core is shared by the browser and two App Router route handlers. Browser-only adapters extract PDF/image text; React components render intake, source proof trail, result ledger, actions, and exports.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, chrono-node, pdfjs-dist, tesseract.js, Motion, Lucide, Vitest, Testing Library, Playwright.

## Global Constraints

- No external API key and no network dependency for text/PDF analysis.
- Main UI does not send document content to the server or persist uploads.
- Facts require exact source quotes and offsets; missing values are never invented.
- Every product behavior follows observed RED → minimal GREEN → full regression.
- UI is responsive, keyboard accessible, reduced-motion safe, and commercial-quality.

---

### Task 1: Project shell and analysis contract

**Files:** `package.json`, config files, `src/core/schema.ts`, `src/core/schema.test.ts`

**Produces:** `AnalysisSchema`, `Analysis`, `Fact`, `Evidence`, and validation that every evidence quote matches the source span.

- [ ] Add generated framework/test configuration.
- [ ] Write schema tests for valid analysis, invalid confidence, and mismatched evidence.
- [ ] Run the focused test and confirm the missing-module failure.
- [ ] Implement the minimal schemas and evidence validator.
- [ ] Run focused and full tests.

### Task 2: Deterministic parser, actions, and conflicts

**Files:** `src/core/analyze.ts`, `src/core/analyze.test.ts`, `src/core/conflicts.ts`, `src/core/conflicts.test.ts`, `src/core/samples.ts`

**Produces:** `analyzeDocument(text, { referenceDate })`, three labeled samples, normalized facts, board actions, uncertainties, conflicts, and deduplication.

- [ ] Add failing behavior tests for bill, itinerary, official notice, ambiguous/missing dates, injection text, duplicates, contradictory deadlines, and OCR noise.
- [ ] Confirm each new behavior fails for absence or wrong output.
- [ ] Add conservative line-aware rules and chrono-node date candidates incrementally.
- [ ] Run focused tests after every behavior and all core tests after each slice.

### Task 3: Safe exports

**Files:** `src/core/redact.ts`, `src/core/redact.test.ts`, `src/core/ics.ts`, `src/core/ics.test.ts`, `src/core/share-card.ts`, tests

**Produces:** `redactSensitiveText`, `toShareSummary`, `createIcs`, and client-side PNG share rendering without source quotes.

- [ ] Write failing redaction tests for identity/contact/address/order/payment/QR data.
- [ ] Implement minimal deterministic redaction and re-run.
- [ ] Write failing ICS tests for escaping, UTC/local timestamps, dedupe, and provenance.
- [ ] Implement RFC 5545 serialization and re-run.

### Task 4: API boundary

**Files:** `src/app/api/health/route.ts`, `src/app/api/analyze/route.ts`, `src/app/api/api.test.ts`

**Produces:** health response and a validated text-only analysis endpoint that calls the shared core.

- [ ] Write failing handler integration tests for health, valid analysis, malformed body, and rejected file-like payloads.
- [ ] Implement the two minimal route handlers.
- [ ] Run API and full tests.

### Task 5: Client extraction and product UI

**Files:** `src/lib/extract-document.ts`, tests, `src/components/*`, `src/app/page.tsx`, `src/app/globals.css`

**Produces:** paste/sample/upload intake, PDF extraction, optional OCR with actionable failure, responsive result workbench, fact-to-source proof trail, action lanes, exceptions, and export controls.

- [ ] Test extraction dispatch and user-facing errors before implementation.
- [ ] Test proof-span segmentation and board categorization helpers before implementation.
- [ ] Implement adapters and the workbench using direct core imports.
- [ ] Add accessible states, progress, keyboard/focus behavior, responsive styles, and reduced-motion rules.
- [ ] Run unit/component tests and inspect desktop/mobile in a real browser.

### Task 6: Submission documentation and end-to-end proof

**Files:** `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/COMPETITION.md`, `e2e/smoke.spec.ts`, `playwright.config.ts`

**Produces:** user-facing handoff, technical contracts, competition copy, and smoke coverage.

- [ ] Write a failing Playwright smoke for sample selection, visible actions, and proof highlighting.
- [ ] Adjust UI only through new failing regressions where behavior changes.
- [ ] Complete docs without claiming Agent Identity creation or submission.
- [ ] Run tests, lint, Playwright when browser is available, and production build.
- [ ] Inspect the exact git diff, stage explicit project paths, and create the requested commit.

## Plan self-review

The tasks cover every brief requirement. Interfaces use one `Analysis` contract and one `analyzeDocument` entry point across browser and API. There are no TODO/TBD product gaps; OCR is intentionally optional with a specified fallback. The plan preserves strict test-first behavior while allowing config scaffolding before behavior tests.

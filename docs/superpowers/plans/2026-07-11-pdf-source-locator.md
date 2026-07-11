# PDF Source Locator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for every behavior and superpowers:verification-before-completion before the single final commit.

**Goal:** Add a browser-local PDF geometry sidecar that can show a selected fact on its original PDF page without changing canonical evidence offsets or weakening the existing text proof.

**Architecture:** PDF extraction will emit canonical text and geometry runs together, then attach the runs and original `File` as UI-only state outside the versioned `Analysis` schema. A pure locator accepts exact evidence offsets and returns rectangles only for unambiguous, complete, zero-rotation coverage on one page. The existing source-text proof remains the default and the failure path for every unsupported geometry case.

**Tech Stack:** TypeScript, React 19, PDF.js, Vitest, Testing Library, Playwright.

## Global Constraints

- Keep canonical `Evidence { quote, start, end }`, `Analysis`, API payloads, and all source offsets unchanged.
- Require exact, complete, non-overlapping whole-run coverage of `[start, end)` on exactly one unrotated PDF page.
- Return no locator for malformed, rotated, cross-page, duplicate/ambiguous, partial-run, incomplete, or stale geometry; never estimate sub-item glyph positions.
- A missing/invalid locator or PDF render failure must preserve the existing exact text-only proof.
- OCR, TXT, pasted text, and built-in samples never receive PDF overlays.
- Use the existing `pdfjs-dist` dependency and existing visual system; add no package or decorative redesign.
- Commit only the verified scoped files once, with a commit subject containing `[verified]`; do not push, merge, deploy, or touch the main worktree.

---

### Task 1: Pure PDF evidence locator

**Files:**
- Create: `src/lib/pdf-source-locator.ts`
- Create: `src/lib/pdf-source-locator.test.ts`

**Interfaces:**
- Consumes: canonical `Evidence` and a PDF-only sidecar whose `sourceText` is the exact analyzed string.
- Produces: `locatePdfEvidence(source, evidence): PdfEvidenceLocator | null` plus normalized page/run/source types.

- [x] **Step 1: Write the first failing complete-coverage test**

```ts
const evidence = { quote: "$42.00", start: source.lastIndexOf("$42.00"), end: source.length };
expect(locatePdfEvidence(sidecar, evidence)).toMatchObject({ pageNumber: 2 });
```

- [x] **Step 2: Run RED**

Run: `npm run test:run -- src/lib/pdf-source-locator.test.ts`

Expected: FAIL because the locator module/behavior is absent.

- [x] **Step 3: Implement the minimal offset-driven locator**

```ts
export function locatePdfEvidence(source: PdfSourceMap, evidence: Evidence) {
  // Validate exact source slice, page/run/rect fields, ordered non-overlap,
  // gap-free [start,end) coverage, zero rotation, and one page; otherwise null.
}
```

- [x] **Step 4: Run GREEN**

Run: `npm run test:run -- src/lib/pdf-source-locator.test.ts`

Expected: PASS.

- [x] **Step 5: Add RED table cases, then minimally harden**

Cases: stale quote/offset, `NaN`/infinite/out-of-range rectangles, invalid source ranges/page numbers, rotated page/run, cross-page coverage, duplicate/overlapping runs, missing first/middle/last coverage, and duplicate quotes on different pages selecting the second quote by its offsets.

Run RED and GREEN after each behavior group with the focused command above.

### Task 2: Canonical PDF extraction sidecar

**Files:**
- Modify: `src/lib/extract-document.ts`
- Modify: `src/lib/extract-document.test.ts`
- Create: `src/lib/pdfjs.ts`

**Interfaces:**
- Consumes: PDF.js page text items and viewports.
- Produces: the unchanged canonical PDF text plus an optional `{ file, map }` source on PDF extraction results.

- [x] **Step 1: Write failing extraction tests**

```ts
expect(result.text).toBe("[Page 1]\nPrevious: $42.00\n\n[Page 2]\nAmount due: $42.00");
expect(locatePdfEvidence(result.source!.map, secondEvidence)?.pageNumber).toBe(2);
```

The fixtures cover line trimming/whitespace collapse, inserted spaces between split `TextItem`s, page-marker/separator offset shifts, malformed item geometry, and rotated text that still extracts but cannot locate.

- [x] **Step 2: Run RED**

Run: `npm run test:run -- src/lib/extract-document.test.ts src/lib/pdf-source-locator.test.ts`

Expected: FAIL because PDF results contain text only.

- [x] **Step 3: Emit normalized characters and runs together**

```ts
type MappedCharacter = { value: string; geometry?: PdfGeometry };
// Normalize the same characters used for canonical output, compress adjacent
// mapped characters into UTF-16 source ranges, and leave page markers unmapped.
```

Invalid geometry is omitted while text remains; page and item rotation remain explicit so the locator can reject them.

- [x] **Step 4: Run GREEN**

Run: `npm run test:run -- src/lib/extract-document.test.ts src/lib/pdf-source-locator.test.ts`

Expected: PASS with canonical strings identical to the pre-feature expectations.

### Task 3: Original-page proof overlay and fallback

**Files:**
- Create: `src/components/pdf-evidence-preview.tsx`
- Modify: `src/components/lifeops-app.tsx`
- Modify: `src/components/lifeops-app.test.tsx`
- Modify: `src/app/globals.css`
- Create: `e2e/pdf-source-locator.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SECURITY.md`
- Modify: `docs/superpowers/specs/2026-07-11-lifeops-inbox-design.md`

**Interfaces:**
- Consumes: `PdfDocumentSource | undefined`, selected canonical evidence, and `locatePdfEvidence`.
- Produces: a PDF.js canvas and normalized highlight rectangles for valid locators; otherwise the unchanged `<pre>`/`<mark data-testid="selected-evidence">` proof.

- [x] **Step 1: Write failing component and Playwright behavior**

```ts
expect(screen.getByRole("figure", { name: /Original PDF page 2 of 2/i })).toBeInTheDocument();
expect(screen.queryByTestId("selected-evidence")).not.toBeInTheDocument();
```

The browser proof generates a deterministic two-page PDF in Chromium, repeats the same money quote on both pages, uploads it, selects the page-two fact, and asserts `data-page-number="2"` plus the second canonical `data-evidence-start`.

- [x] **Step 2: Run RED**

Run: `npm run test:run -- src/components/lifeops-app.test.tsx`

Run: `npm run test:e2e -- --project=desktop-chromium e2e/pdf-source-locator.spec.ts`

Expected: FAIL because no original-page surface exists.

- [x] **Step 3: Implement the minimal targeted UI**

Retain PDF source only for the active local result, clear it on edits/samples/non-PDF uploads/failure, render the selected page, place percentage-based highlight boxes over the canvas, expose the page/evidence offset through stable test attributes, and switch to the existing text proof on invalid locator or render failure.

- [x] **Step 4: Run focused GREEN and visual inspection**

Run the same focused Vitest and Playwright commands, inspect the generated original-page proof screenshot, and confirm the overlay remains within the page at desktop and mobile widths.

### Task 4: Final verification and scoped commit

**Files:** all scoped files above only.

- [x] **Step 1: Run required gates from a clean production state**

```bash
npm run test:run
npm run lint
npm run build
PLAYWRIGHT_SINGLE_PROCESS=1 npm run test:e2e -- --project=desktop-chromium e2e/pdf-source-locator.spec.ts
```

- [x] **Step 2: Self-review and independent review**

Check the full branch diff against every Global Constraint, confirm no canonical schema/offset changes, no dependency changes, no OCR locator, and no unrelated file changes. Resolve all Critical/Important review findings and rerun affected gates.

- [ ] **Step 3: Commit explicit paths only**

Stage only verified files with explicit `git add <paths...>` and commit once with a subject containing `[verified]`. Do not push, merge, deploy, or modify the main worktree.

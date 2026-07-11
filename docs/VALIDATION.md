# Validation report

Verified on **2026-07-11** against the public production deployment at [lifeops-inbox.vercel.app](https://lifeops-inbox.vercel.app).

This report separates observed results from product claims. It does not treat mock tests, stars, or a generated screenshot as production proof.

## Production browser probes

A real headless Chromium session generated and uploaded synthetic `File` objects through the public site's file input. Each case used the same notice facts:

- status: `OVERDUE`
- amount due: `$42.00`
- original due date: `July 10, 2026`
- service renewal: `July 15, 2026`

| Input | Production result | Expected action | Browser errors | End-to-end time |
|---|---|---|---:|---:|
| TXT | `$42.00` extracted | `Pay $42.00` | 0 | 1.326 s |
| PDF | `$42.00` extracted | `Pay $42.00` | 0 | 2.025 s |
| PNG OCR | `$42.00` extracted | `Pay $42.00` | 0 | 4.061 s |

The public health endpoint returned HTTP `200` during the same run.

## Original-PDF evidence verification

The PDF locator has separate, stricter coverage because extraction success does not imply that a glyph-level overlay is safe.

A two-page PDF fixture contains the same `$42.00` quote on both pages. The relevant `Amount due` value appears in the lower-right area of page 2. Desktop and mobile Chromium tests verify that clicking the cited fact:

- opens page 2 rather than the first duplicate quote;
- preserves the canonical evidence start offset;
- renders the original PDF canvas;
- produces a non-empty evidence overlay inside the page bounds;
- withholds the overlay for unsupported rotated/partial geometry and keeps the exact extracted-text proof instead.

The same path was exercised against production: page `2`, render state `ready`, a non-empty overlay, HTTP health `200`, and no browser page errors.

### Conservative fallback

PDF.js may combine a label and value into one `TextItem`. LifeOps does not infer sub-item glyph widths. If evidence starts or ends inside such an item, or geometry is rotated, cross-page, malformed, ambiguous, stale, or incomplete, the original-page overlay is withheld. The exact source-text citation remains available. This is deliberate fail-closed behavior, not a successful locator claim.

## Automated verification

| Gate | Result |
|---|---:|
| Vitest files | 12 passed |
| Unit and component tests | 127 passed |
| Desktop PDF locator E2E | passed |
| Mobile PDF locator E2E | passed |
| ESLint | passed |
| Next.js production build | passed |


The suite covers schema validation, exact evidence spans, parser/adversarial cases, conflicts, redaction, extraction dispatch, PDF geometry, race handling, presentation, samples, API routes, calendar serialization, and component interactions.

## Independent calendar interoperability

Generated calendars are parsed by **ICAL.js 2.2.1** as an independent RFC 5545 consumer. Tests verify:

- one timed event with the expected summary and description;
- fixed source timezone `LifeOps/PST` and local wall time;
- date-only actions round-trip as all-day values;
- the existing serializer's stable UID, escaping, deduplication, and 75-octet UTF-8 folding tests continue to pass.

ICAL.js is a development-only validation dependency. It does not enter the production runtime or change calendar generation.

## Reproduce the repository gates

```bash
npm install
npm run lint
npm run test:run
npm run build
PLAYWRIGHT_BROWSERS_PATH=.playwright npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

The production browser probes use generated TXT, PDF, and PNG files against the public URL; their observed results are recorded above. They are intentionally separate from local mock tests.

## Privacy boundary

- TXT, PDF, and image bytes stay in the browser workspace.
- The server API accepts text only and responds with `Cache-Control: no-store`.
- No account, database, analytics SDK, model key, or document-upload endpoint is required.
- Public share output excludes source text and evidence quotes and redacts identity, contact, address, reference, booking/order, payment-like, and QR/barcode identifiers.

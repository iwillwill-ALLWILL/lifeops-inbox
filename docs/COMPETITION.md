# Competition positioning

## Core pitch

**LifeOps Inbox turns the paperwork of everyday life into an evidence-backed execution plan—privately, without an API key.**

The category wedge is life administration: overdue bills, travel logistics, school/work/medical notices, and official deadlines. The product earns trust by showing exact evidence, refusing to invent missing fields, catching contradictions, and exporting actions into tools people already use.

## Award strategy

1. **Lifestyle Companion** — strongest fit. It reduces recurring cognitive load across money, travel, family, health, school, work, and events.
2. **Best Product** — a complete, inspectable loop: input → proof → decisions → calendar/share exports, with polished desktop/mobile UI and no setup friction.
3. **Creative Genius** — the “proof trail + conflict radar + privacy-safe before/after card” reframes document AI as trustworthy personal operations, not chat or summarization.

## Why judges should care

- Immediate demo: choose any built-in sample and useful output appears through the real parser.
- Trust is interactive: selecting a fact highlights its exact source quote.
- The product admits uncertainty and preserves conflicting evidence.
- The main path is local-first and works without keys or accounts.
- Output leaves the app: `.ics` calendar and safe SVG share card.
- The same versioned core already has a text-only API boundary for future A2A packaging.

## 90-second demo storyboard

| Time | Screen / action | Talk track |
| --- | --- | --- |
| 0–08s | Hero, then scroll to intake | “Life admin does not arrive as tasks. It arrives as paperwork.” |
| 08–20s | Choose **Overdue renewal bill** | “No key, no account. This built-in sample goes through the same parser as your text or PDF.” |
| 20–36s | Show confidence, amount, overdue state, renewal | “LifeOps extracts only cited facts and normalizes what is explicit.” |
| 36–48s | Click **Amount due**; source highlights `$184.62` | “Every fact has a proof trail. One click takes you to the exact words.” |
| 48–60s | Show Now / This Week lanes | “The result is not a summary. It is an execution board: pay now, review renewal this week.” |
| 60–70s | Choose **Genesis hackathon deadlines** | “Contradictions are not averaged away. The portal closes a day before the stated deadline, so LifeOps flags it.” |
| 70–80s | Download calendar and safe share card | “Actions become a real calendar; public sharing excludes names, references, source text, and identifiers.” |
| 80–90s | Judge-facing four principles | “Provenance, conflict detection, privacy, and executable output: that is why this is a lifestyle companion, not generic OCR.” |

## ASP draft

No ASP or Agent Identity has been created. The following is submission-ready copy only.

**ASP name:** LifeOps Inbox

**Short description:** Turns bills, bookings, notices, and confirmations into cited facts, visible uncertainties, and calendar-ready next actions.

**Service name:** `Life Admin Action Plan`

**Service description:**

Turns bills, bookings, notices, and confirmations into cited facts, conflicts, and calendar-ready next actions.

Provide the document text and, optionally, a reference timestamp.

**Service type:** Agent to agent

**Category:** Lifestyle / Personal Operations

**Fee recommendation:** 0.02 USDT per successful analysis. Do not charge for validation failures or empty analyses.

## Final submission field drafts

**Project name**

LifeOps Inbox

**Tagline**

Drop the paperwork. Get the next actions.

**One-line description**

A local-first lifestyle companion that turns everyday documents into cited facts, visible conflicts, and calendar-ready next actions.

**Problem**

Important life tasks are trapped in bills, travel confirmations, school/work/medical notices, and official emails. Traditional OCR gives text; summarizers give prose. Users still have to verify dates, reconcile contradictions, decide what comes first, and manually create reminders.

**Solution**

LifeOps Inbox parses pasted text and client-extracted PDFs/images with a deterministic hybrid engine. It produces a proof-linked fact ledger, normalized dates/timezones/amounts/locations, a Now / This Week / Waiting board, explicit uncertainty/conflict warnings, an `.ics` calendar, and a redacted before/after share card.

**What makes it different**

Every fact carries a verbatim source span. Missing values stay missing. Conflicting deadlines remain visible. The main workflow stays in-browser. The final output is executable, not merely readable.

**Target user**

Anyone managing household bills, family schedules, travel, school, work, appointments, or deadline-heavy events—especially people overwhelmed by fragmented life admin.

**Technical summary**

Next.js App Router and TypeScript; Zod-validated deterministic core; chrono-node plus domain rules; PDF.js and optional Tesseract.js in the browser; RFC 5545 calendar export; privacy-safe SVG export; shared text-only API route for future A2A use.

**OKX.AI / agent ecosystem fit**

The deterministic analyzer is packaged behind a strict, versioned text contract that can become an ASP service. An agent can request analysis, preserve citations and uncertainties, then coordinate downstream calendar or task agents with user approval. This submission does not claim an already-registered Agent Identity.

**Privacy statement**

The main workspace does not upload or persist documents. File bytes remain in-browser. Public share output excludes source text and redacts identity, contact, address, booking/order, payment-like, and QR identifiers.

**Repository validation**

Vitest covers schema, parser, adversarial cases, redaction, calendar export, conflicts, API routes, extraction dispatch, proof segmentation, share SVG, and the sample-to-proof UI path. Playwright smoke specs cover desktop and mobile Chromium when the host allows browser launch.

## Submission checklist

- Record the 90-second demo using all three samples, but center the bill and conflict notice.
- Capture desktop proof-trail and mobile action-board screenshots.
- Host the app and verify `/api/health` publicly.
- Add final repository and demo URLs to the field drafts.
- Review the safe share card before posting it.
- Only after explicit approval: create/register the Agent Identity or ASP entry using the copy above.

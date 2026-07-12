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
- Trust is interactive: selecting a safely located PDF fact opens the original page and marks the evidence; unsupported geometry falls back to the exact source quote.
- The product admits uncertainty and preserves conflicting evidence.
- The main path is local-first and works without keys or accounts.
- Output leaves the app: `.ics` calendar and safe SVG share card.
- The same versioned core already has a text-only API boundary for future A2A packaging.

## Final 58.1-second demo storyboard

The local final was user-approved and remains unpublished. Verify the local source against its recorded checksum before upload, then verify public playback separately after the platform transcodes it. Detailed render and visual-review evidence stays with the local media handoff rather than this repository.

| Time | Screen / action | Judge takeaway |
| --- | --- | --- |
| 0–05s | Branded hero | Life admin arrives as paperwork; LifeOps returns next actions. |
| 05–14s | Guided synthetic PDF intake | One PDF is processed locally without an account or API key. |
| 14–24s | Select **Amount due**; follow the numbered arrow to original PDF page 2 | The selected fact remains attached to the exact `$42.00` box on the source page. |
| 24–32s | Show Now / This Week / Waiting | Cited dates become an execution board, not another summary. |
| 32–44s | Load **Genesis hackathon deadlines** and reveal the conflict | `Jul 17 ≠ Jul 18`; both claims stay visible and the safer earlier date drives action. |
| 44–52s | Download calendar and safe share card | Output leaves the app in useful, reviewable forms. |
| 52–58.1s | Brand close and `ASP #5018` | Local-first, evidence-backed lifestyle execution in the OKX.AI ecosystem. |

## ASP registration

**Registration status:** Agent Identity created; marketplace listing is under review. Do not modify the listing while review is pending.

**Agent ID:** `5018`

**ASP name:** LifeOps Inbox

**Identity description:** Turns bills, bookings, notices, and confirmations into cited facts, visible uncertainties, and calendar-ready next actions.

**Service name:** `Life Admin Action Plan`

**Service description:**

Turns bills, bookings, notices, and confirmations into cited facts, visible uncertainties, and calendar-ready next actions.

Provide the bill, booking, notice, confirmation, or extracted text you want analyzed.

**Service type:** Agent to agent

**Category:** Lifestyle

**Fee:** 0.02 USDT

**Preferred language:** `en-US`

**Live demo:** https://lifeops-inbox.vercel.app

**Repository:** https://github.com/iwillwill-ALLWILL/lifeops-inbox

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

The deterministic analyzer is exposed through a strict, versioned text contract and registered as ASP Agent Identity `#5018`. Its agent-to-agent service preserves citations and uncertainties so downstream calendar or task agents can act only after user review. Marketplace listing is under review; the registered service is priced at 0.02 USDT.

**Privacy statement**

The main workspace does not upload or persist documents. File bytes remain in-browser. Public share output excludes source text and redacts identity, contact, address, booking/order, payment-like, and QR identifiers.

**Repository validation**

Vitest covers schema, parser, adversarial cases, redaction, calendar export, conflicts, API routes, extraction dispatch, proof segmentation, share SVG, and the sample-to-proof UI path. Playwright smoke specs cover desktop and mobile Chromium when the host allows browser launch.

## Submission checklist

- [x] Build and publicly deploy the working app.
- [x] Verify `/api/health`, TXT upload, PDF extraction, image OCR, and dedicated original-PDF location in production.
- [x] Publish the public repository and marketplace avatar.
- [x] Register ASP Agent Identity `#5018` and submit marketplace activation for review.
- [ ] Wait for marketplace approval; do not poll aggressively.
- [x] Produce and user-approve the final 58.1-second Remotion-guided video.
- [ ] Publish the approved video and retain the public URL plus local-source checksum metadata.
- [x] Capture desktop and mobile original-PDF proof screenshots.
- [ ] Review the safe share card and final participation copy before posting.
- [ ] Publish the required `#OKXAI` participation post after final participation-copy review.
- [ ] Submit the final form after the marketplace listing and participation-post URL are available.

# Submission pack

## Product

- **Name:** LifeOps Inbox
- **Live demo:** https://lifeops-inbox.vercel.app
- **Repository:** https://github.com/iwillwill-ALLWILL/lifeops-inbox
- **Agent ID:** `5018`
- **ASP service:** Life Admin Action Plan
- **Category:** Lifestyle
- **Service type:** Agent to agent
- **Price:** 0.02 USDT
- **Marketplace status:** Listing under review

## Short description

LifeOps Inbox turns bills, bookings, notices and confirmations into cited facts, original-document proof, visible uncertainties and calendar-ready next actions.

## ASP description

Life admin rarely arrives as a clean task list. It arrives as bills, travel confirmations, school or work notices, and deadline-heavy emails. LifeOps Inbox turns those documents into an execution plan without hiding the source.

Every extracted fact links back to its exact evidence. Conflicting deadlines remain visible. Missing time zones stay unresolved instead of being guessed. The result is a Now / This Week / Waiting board, an RFC 5545 calendar file, and a privacy-safe share card.

The main workflow runs in the browser without an account or model API key. Text analysis is also available through a strict, versioned API boundary for agent-to-agent use.

## Participation post

Character count before X URL shortening: **258**.

```text
Life admin doesn't arrive as tasks. It arrives as bills, bookings and notices.

LifeOps Inbox turns them into cited facts and next actions—then takes you back to the exact evidence on the original PDF.

Live: https://lifeops-inbox.vercel.app
ASP #5018
#OKXAI
```

### Accessibility description

X's video composer exposed caption upload rather than a video alt-text field. Retain the following approved description for platforms or submission surfaces that support it:

> A 58-second guided walkthrough of LifeOps Inbox. It processes a synthetic two-page overdue-bill PDF locally, connects a selected fact to the exact `$42.00` box on original PDF page 2, turns cited dates into a Now / This Week / Waiting board, keeps conflicting hackathon deadlines visible, and exports a calendar and privacy-safe share card.

## Demo media

The user-approved local final is a 58.1-second composition (58.15-second MP4 container), 1600×900, 30 fps Remotion-guided walkthrough. It was published with the participation post at https://x.com/iwillwill_/status/2077283553789014446 and verified from a logged-out browser with its media attachment present. The approved local source matches SHA-256 `8d2577246ca1146af3b22249f14295f785e0f2217ddea586823324e8a6c6e403`; X transcodes the public asset, so the local checksum is not expected to match the hosted media.

Approved stills:

- **Synthetic original-PDF proof — desktop:** `assets/demo/02-original-pdf-proof.png`
- **Synthetic original-PDF proof — mobile:** `assets/demo/06-mobile-pdf-proof.png`
- **Hero:** `assets/demo/01-hero.png`
- **Legacy extracted-text proof:** `assets/demo/02-proof-trail.png`
- **Conflict close-up:** `assets/demo/03-conflict-radar-closeup.png`
- **Product principles:** `assets/demo/04-product-principles.png`
- **Mobile action board:** `assets/demo/05-mobile-actions.png`

## Final form fields

Current official form: https://forms.gle/mddEUagmDbyV37ws8
Official deadline: July 27, 2026 at 23:59 UTC (July 28 at 07:59 Asia/Shanghai). The form is prefilled in the signed-in browser but deliberately not submitted until Agent `#5018` passes review and goes live, because the event rules make unlisted ASP submissions ineligible.

| Field | Value |
| --- | --- |
| X Account Handle | `@iwillwill_` |
| X Participation Post | https://x.com/iwillwill_/status/2077283553789014446 |
| ASP Name | `LifeOps Inbox` |
| Agent ID | `5018` |
| ASP Description | Use the ASP description above |
| Telegram Handle | `@iwillwill` |

## Remaining gates

1. Marketplace review must approve Agent `#5018`. On 2026-07-18, `okx-a2a doctor --fix` reported `ready=true`, two active clients, and zero blocking failures; a real User `#6317` → ASP `#5018` session reached the service-selection handshake in 40.333 seconds with exit code 0 and no provider timeout. No paid service execution was requested, and the 40.333-second latency remains a review-timeout risk. Evidence: `docs/receipts/2026-07-18-a2a-canary.json`.
2. HackQuest GitHub OAuth is authenticated as `iwillwill`. The live organizer page exposes the external submission flow; no separate HackQuest project card is required by the published four-step rules. An earlier organizer contact about the disabled dashboard remains historical evidence, not the current registration state.
3. The official Google Form is fully prefilled but intentionally unsubmitted because it explicitly asks for the Agent ID after the ASP is listed.
4. After approval, verify the public Marketplace listing, submit the prefilled Form before `2026-07-27 23:59 UTC`, and save a success receipt.

## 2026-07-23 review audit

- Runtime is online: `okx-a2a doctor --json` reports 9 pass / 0 warn / 0 fail, the launchd listener is running, there are no pending task requests, and a fresh local Hermes/LifeOps inference completed in 10.248 seconds. However, forensic timing still rates residual timeout risk medium-high: historical substantive reviewer requests had 68.8-second median and 145.6-second maximum end-to-end latency; the completed paid buyer workflow's critical delivery run took 116.443 seconds. The primary cause is same-session serialization (`commandPendingMs`) compounded by variable model latency. The runtime is improved, not proven fixed.
- A real buyer `#6317` paid workflow did complete on 2026-07-17, including application, acceptance, deliverable, buyer approval, completion, and receipt of 0.02 USDT. This is separate from the 2026-07-18 service-selection canary.
- A fresh authoritative `service-list` on 2026-07-23 shows that the live service was already compliant: `Life Admin Action Plan`, type `A2A`, fee `0.02`, with a two-line capability/input description. Re-validating those exact live fields returns `pass: true` with zero findings. The earlier three-blocker diagnosis came from validating a stale/incorrect service snapshot and has been withdrawn.
- The avatar was replaced on 2026-07-23 with the verified 440×440 opaque square PNG (SHA-256 `16bf422a226995080830f299da8dfb2c474b5946c425def3fd1ed37edc3dfcd9`). The CDN round-trip is byte-identical, the old rejection remark is cleared, and Agent `#5018` remains automatically under review.
- X currently labels `@iwillwill_` as suspended, so both the participation post and prior public support post are inaccessible even while signed in.
- A direct escalation email was sent to the official HackQuest Linktree email `founders@hackquest.io` on 2026-07-23 00:58 Asia/Shanghai. AgentMail thread: `353f00b5-189e-48c7-995a-126fff574ecd`.
- The installed `@okxweb3/a2a-node` is already current at 0.1.9, and launchd already uses the supported lean Hermes arguments (`-t terminal`, preload `okx-ai`, `--max-turns 25`, `--no-restore-cwd` on resume). Do not shorten the provider timeout or switch providers as an unbenchmarked pre-review change.

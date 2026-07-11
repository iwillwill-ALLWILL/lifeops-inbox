# LifeOps Inbox MVP Design

## Product decision

LifeOps Inbox is a local-first operations workbench for people whose important next steps are buried in paperwork. The first job is not “summarize this document”; it is “show me what is true, prove where it came from, and turn it into safe next actions.” The supplied hackathon brief is the approved design authority. Where it leaves room, this spec chooses the smallest competition-ready behavior and does not invent facts.

## Experience

The first viewport pairs a concise promise with a working intake surface. A user can paste text, select one of three clearly labeled realistic samples, or choose a text, PDF, or image file. Analysis happens locally in the browser. The result view becomes an operations desk:

- Source pane: a safely located PDF fact appears on its original page; all other inputs and unsupported PDF geometry use the exact text with the selected source span highlighted and scrolled into view.
- Brief header: document kind, calibrated confidence, privacy statement, and export controls.
- Fact ledger: normalized values beside verbatim evidence quotes; selecting a row drives the proof trail.
- Action board: Now, This Week, and Waiting lanes derived only from extracted facts.
- Exceptions: uncertainties and conflicts are first-class, not buried in a summary.
- Exports: standards-compliant `.ics` and a downloadable privacy-safe share card.

The visual identity is a calm operations desk: chalk and warm paper neutrals, ink blue, signal green, amber for uncertainty, and red only for conflicts. Tight utility typography carries the workflow; a restrained serif display face gives the promise editorial authority. The signature visual is a highlighter proof trail connecting ledger and source. Motion is limited to analysis completion, selected evidence, and board entry, with reduced-motion support.

## Architecture

`src/core` is a deterministic, environment-agnostic TypeScript library. It owns the Zod schema, line-aware parsing, evidence offsets, normalization, conflicts, action derivation, redaction, and ICS serialization. `analyzeDocument(text, options)` is the single entry used by both the client and `/api/analyze`.

The client imports the same core directly. Text never needs to cross the network. PDF extraction dynamically imports `pdfjs-dist` and emits canonical text plus a browser-local geometry sidecar without changing the analysis contract. The original PDF `File` is retained only for the active local result so a safely located page can be rendered, then released when the input is edited or replaced; it is never persisted. Image OCR dynamically imports `tesseract.js`; initialization or recognition failures return an actionable message asking the user to paste text instead, and OCR geometry overlays are deferred.

App Router route handlers expose `GET /api/health` and opt-in `POST /api/analyze` for future A2A use. The analyze route accepts JSON text only, validates size and shape, and never accepts file bytes.

## Deterministic analysis contract

Facts include `id`, `kind`, `label`, raw `value`, optional `normalizedValue`, confidence, and evidence `{ quote, start, end }`. Dates additionally expose ISO values, timezone when explicit/inferred from a known airport, and missing-component flags. No field may exist without a matching source span.

The parser combines chrono-node candidates with domain rules for money, confirmation/reference identifiers, airport/flight details, locations, renewal/due language, and deadline/action verbs. Malicious instructions inside a document are inert text. Missing years and timezones produce uncertainty rather than guessed certainty. Similar events are deduplicated by normalized title/date/location. Contradictory labels or nearby deadline phrases generate conflicts while preserving both cited values. OCR-tolerant normalization is conservative and preserves the original quote.

Actions are derived from explicit obligation/deadline language and categorized relative to a supplied reference date for deterministic tests. “Now” means overdue or due within 48 hours, “This Week” means the next seven days, and “Waiting” covers later, missing-date, check-in, and confirmation-dependent work. Exported calendar events include provenance in their description and omit actions without usable dates.

## Privacy and safety

The regular result keeps source evidence because the user supplied it locally. Share output is generated from a separate redacted projection. It redacts person names where labeled, email addresses, phones, street-like addresses, order/booking/reference IDs, long payment-like numbers, and QR/barcode identifiers. The share card never renders raw document text or evidence quotes. Prompt-injection language is displayed only as source data and cannot change parser behavior.

## Built-in samples

1. Overdue utility renewal bill: overdue amount, renewal date, autopay ambiguity, and account reference.
2. Flight and hotel itinerary: flight times in origin/destination timezones, hotel check-in, confirmation IDs, and travel actions.
3. Official Genesis hackathon notice: registration, submission, and demo deadlines with one deliberate schedule conflict to demonstrate exception handling.

Samples are visibly labeled “Built-in sample.” Their parsed outputs are produced at runtime by the same core as user input.

## Failure and recovery

Empty or content-free inputs remain in the intake state with a specific message. Unsupported files explain accepted types. PDF extraction errors suggest copying the selectable PDF text. Whole PDF geometry runs must exactly, completely, and unambiguously cover the evidence on one unrotated page; partial text-item geometry is never estimated and instead uses the existing text-only proof. OCR reports initialization/progress and on failure recommends pasting the text; it never returns fabricated content. Invalid API input returns a structured 400 response. A partial analysis with no dates still presents facts and uncertainties, while calendar export is disabled with an explanation.

## Verification strategy

Vitest tests cover schema/evidence integrity, parser behavior, adversarial inputs, OCR noise, date ambiguity, missing year/timezone, duplicate suppression, contradictions, redaction, and ICS output. A route-handler integration test covers health and analysis validation. Playwright covers the built-in sample path, proof-trail selection, and mobile smoke if the browser is locally available. Every production behavior is introduced only after its focused test has failed for the expected reason.

## Self-review

- No placeholders or deferred product behavior.
- Client and API use the same deterministic core.
- “Local-first” is not contradicted by the optional text-only API.
- Samples use real parser execution and are explicitly labeled.
- Missing data always becomes an uncertainty or omitted field, never a guess.

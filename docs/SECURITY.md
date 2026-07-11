# Security and privacy model

## Guarantees in this MVP

- The main workspace imports the parser directly and makes no analysis request.
- Uploads are held as browser `File` objects only for extraction; the active PDF result retains its local `File` for original-page preview until the document is edited or replaced. Uploads are never persisted by the app.
- PDF and image bytes are not accepted by `/api/analyze`.
- Every fact must validate against an exact source substring.
- Share output is produced from a separate projection that omits source text, evidence quotes, and source-derived titles.
- API responses use `Cache-Control: no-store`.

## Share-card redaction

The safe projection redacts or excludes:

- labeled person names;
- email addresses and phone numbers;
- labeled street/mailing/billing addresses;
- booking, confirmation, reference, and order identifiers;
- account/card/payment-like long numbers;
- QR and barcode identifiers;
- the complete source text and all direct evidence quotes.
- the source-derived analysis title; share titles come only from the document-kind allowlist.

Dates, currency amounts, action lanes, and aggregate counts remain because they make the before/after card useful. Users should still review any exported artifact before public posting.

## Document injection

The deterministic parser does not execute prompts or call an LLM. Strings such as “SYSTEM: ignore previous instructions” are treated as untrusted document content, excluded from facts/actions, and surfaced as a handled uncertainty. Uploaded HTML and scripts are unsupported. React escapes rendered text, and the SVG exporter XML-escapes dynamic values.

## Failure handling

- Empty or whitespace-only text: the UI stops with an actionable prompt and the API returns a structured 400 response.
- PDF without selectable text: user is told to use an image or paste text.
- PDF geometry that is malformed, rotated, cross-page, ambiguous, partial-run, or incomplete: the original-page overlay is withheld and the exact extracted-text proof remains available. The app does not infer sub-item glyph positions.
- OCR initialization/recognition failure: no result is fabricated; the UI suggests a clearer image or pasted text.
- Ambiguous dates: the parser preserves the candidate while flagging ambiguity, missing year, or timezone.
- Contradictions: both cited values remain visible and the earlier deadline is recommended until verified.

## Dependencies and network behavior

Text parsing and PDF extraction require no external service. Tesseract OCR is optional and may fetch runtime/language assets on first use; image recognition runs in a client worker. No document content is intentionally transmitted to an OCR API. Sites with strict offline requirements should self-host and pin those OCR assets in a future hardening pass.

## Out of scope

This MVP does not provide authentication, encrypted vault storage, medical/legal advice, payment execution, email/calendar account access, multi-user sharing, or a registered OKX Agent Identity. The calendar download contains cited source phrases and should be treated as private unless the user reviews it.

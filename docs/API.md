# API and future A2A contract

The API is optional. The main UI does not call it.

## Health

`GET /api/health`

```json
{
  "ok": true,
  "service": "lifeops-inbox",
  "parser": "deterministic-v1"
}
```

## Analyze text

`POST /api/analyze`

```json
{
  "text": "Amount due: $42.00\nDue date: July 14, 2026",
  "referenceDate": "2026-07-11T12:00:00Z"
}
```

- `text` is required and must contain 1–100,000 non-whitespace characters after trimming. Empty and whitespace-only values return the structured 400 response below.
- `referenceDate` is optional ISO 8601 with an offset. It makes relative-date behavior deterministic; when omitted, analysis uses the request-time `new Date()` reference.
- The request schema is strict. File/base64 fields are rejected.
- Responses use `Cache-Control: no-store`.

Success:

```json
{
  "analysis": {
    "version": "1.0",
    "sourceText": "…",
    "title": "…",
    "documentKind": "bill",
    "confidence": 0.96,
    "facts": [],
    "actions": [],
    "uncertainties": [],
    "conflicts": []
  }
}
```

Invalid request:

```json
{
  "error": "Send 1–100,000 characters in the text field only. File bytes are not accepted."
}
```

## Proposed A2A service

This is a contract draft, not a registered Agent Identity.

| Field | Draft |
| --- | --- |
| Service name | `analyze_life_document` |
| Category | Lifestyle / Personal Operations |
| Input | `text`, optional `referenceDate` |
| Output | Versioned `Analysis` JSON |
| Determinism | Same input + reference date yields the same structured result |
| Privacy | Text-only opt-in endpoint; no file bytes; no persistence |
| Suggested fee | 0.02 USDC per analysis after a free demo allowance |

An A2A wrapper should forward only user-approved text, retain the `version` field, and surface every uncertainty/conflict unchanged. It must not claim OCR or accept raw files unless a future security review explicitly expands the boundary.

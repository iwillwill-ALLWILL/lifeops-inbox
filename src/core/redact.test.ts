import { describe, expect, it } from "vitest";
import { analyzeDocument } from "./analyze";
import { redactSensitiveText, toShareSummary } from "./redact";

describe("redactSensitiveText", () => {
  it("redacts labeled names, emails, phones, street addresses, references, payment-like numbers, and QR IDs", () => {
    const source = [
      "Passenger: Jordan Lee",
      "Email: jordan.lee@example.com",
      "Phone: +1 (415) 555-0199",
      "Service address: 126 Willow Street, Portland, OR 97205",
      "Order ID: ORD-4829-1177",
      "Account: 7742 1904 5521",
      "QR code: QR-SECRET-993188",
    ].join("\n");

    const result = redactSensitiveText(source);

    expect(result).not.toMatch(/Jordan Lee|jordan\.lee|415|Willow|4829|7742|SECRET/);
    expect(result).toContain("[NAME]");
    expect(result).toContain("[EMAIL]");
    expect(result).toContain("[PHONE]");
    expect(result).toContain("[ADDRESS]");
    expect(result).toContain("[REFERENCE]");
    expect(result).toContain("[PAYMENT NUMBER]");
    expect(result).toContain("[QR IDENTIFIER]");
  });

  it("does not redact ordinary dates or currency amounts", () => {
    const source = "Due July 15, 2026. Amount: $184.62";
    expect(redactSensitiveText(source)).toBe(source);
  });
});

describe("toShareSummary", () => {
  it("omits raw source and evidence quotes from the share-safe projection", () => {
    const analysis = analyzeDocument(
      "Passenger: Jordan Lee\nAmount due: $42.00\nDue date: July 14, 2026",
      { referenceDate: new Date("2026-07-11T12:00:00Z") },
    );

    const share = toShareSummary(analysis);
    const serialized = JSON.stringify(share);

    expect(serialized).not.toContain("Jordan Lee");
    expect(serialized).not.toContain("sourceText");
    expect(serialized).not.toContain("evidence");
    expect(share.title).toBe("Bill summary");
    expect(share.actions[0]?.title).toBe("Pay $42.00");
  });

  it("derives the share title only from document kind, not the raw source title", () => {
    const rawTitle = "CONFIDENTIAL PROJECT AURORA";
    const analysis = analyzeDocument(
      `${rawTitle}\nBooking reference: TOP-SECRET\nDeparts: Paris (CDG) — Aug 18, 2026 at 10:30 PM UTC`,
      { referenceDate: new Date("2026-07-11T12:00:00Z") },
    );

    const share = toShareSummary(analysis);

    expect(share.title).toBe("Travel plan");
    expect(JSON.stringify(share)).not.toContain(rawTitle);
  });
});

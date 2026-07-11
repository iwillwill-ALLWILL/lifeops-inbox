export type DemoSample = {
  id: "renewal-bill" | "travel-itinerary" | "official-notice";
  badge: "Built-in sample";
  eyebrow: string;
  title: string;
  description: string;
  text: string;
};

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: "renewal-bill",
    badge: "Built-in sample",
    eyebrow: "Household",
    title: "Overdue renewal bill",
    description: "An overdue balance, a near-term renewal, and an AutoPay gap.",
    text: [
      "EVERGREEN ENERGY — RENEWAL NOTICE",
      "Statement issued: July 8, 2026",
      "Account holder: Maya Chen",
      "Service address: 126 Willow Street, Portland, OR 97205",
      "Account: 7742 1904 5521",
      "Amount due: $184.62",
      "Original due date: June 28, 2026",
      "Status: OVERDUE",
      "Service renewal: July 15, 2026",
      "AutoPay: not enrolled",
      "To avoid interruption, pay the overdue balance before renewal.",
      "Questions: billing@evergreen-example.com or (503) 555-0184",
    ].join("\n"),
  },
  {
    id: "travel-itinerary",
    badge: "Built-in sample",
    eyebrow: "Travel",
    title: "Flight + hotel itinerary",
    description: "Four local times across two timezones with check-in preparation.",
    text: [
      "SKYWAYS TRAVEL CONFIRMATION",
      "Passenger: Jordan Lee",
      "Flight SQ 12",
      "Departs: San Francisco (SFO) — Aug 18, 2026 at 10:30 PM PDT",
      "Arrives: Singapore (SIN) — Aug 20, 2026 at 6:15 AM SGT",
      "Booking reference: K7P9QX",
      "Hotel: The Fullerton Bay Hotel",
      "Check-in: Aug 20, 2026 at 3:00 PM SGT",
      "Check-out: Aug 23, 2026 at 11:00 AM SGT",
      "Hotel confirmation: FBH-882140",
      "Online check-in opens 24 hours before departure.",
      "Airport transfer is not included.",
    ].join("\n"),
  },
  {
    id: "official-notice",
    badge: "Built-in sample",
    eyebrow: "Official notice",
    title: "Genesis hackathon deadlines",
    description: "A verified public deadline plus a conflicting forwarded reminder worth catching.",
    text: [
      "OKX.AI GENESIS HACKATHON — DEMO PARTICIPANT ACTION MEMO",
      "Memo date: July 10, 2026",
      "Verified public submission deadline: July 17, 2026, 23:59 UTC",
      "Forwarded reminder claims the submission portal closes: July 18, 2026, 23:59 UTC",
      "Internal QA deadline: July 16, 2026 at 18:00 UTC",
      "X participation post target: July 17, 2026 at 20:00 UTC",
      "Demo walkthrough must be no longer than 90 seconds and include #OKXAI.",
      "Final submission needs a public demo link, ASP name, Agent ID, and X participation post URL.",
      "This built-in memo is illustrative demo data; verify live organizer pages before acting.",
    ].join("\n"),
  },
];

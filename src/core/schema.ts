import { z } from "zod";

export const EvidenceSchema = z.object({
  quote: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
});

export const FactSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "amount",
    "date",
    "time",
    "location",
    "reference",
    "person",
    "organization",
    "travel",
    "status",
    "contact",
    "other",
  ]),
  label: z.string().min(1),
  value: z.string().min(1),
  normalizedValue: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1),
  evidence: EvidenceSchema,
  date: z
    .object({
      iso: z.string().min(1),
      dateOnly: z.boolean(),
      timezone: z.string().min(1).optional(),
      timezoneAbbreviation: z.string().regex(/^[A-Z]{2,5}$/).optional(),
      utcOffset: z.string().regex(/^[+-]\d{2}:\d{2}$/).optional(),
      hasExplicitYear: z.boolean(),
      hasExplicitTime: z.boolean(),
      hasExplicitTimezone: z.boolean(),
    })
    .optional(),
});

export const ActionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  lane: z.enum(["now", "this-week", "waiting"]),
  status: z.enum(["open", "blocked", "done"]).default("open"),
  dueAt: z.string().min(1).optional(),
  dateOnly: z.boolean(),
  detail: z.string().min(1).optional(),
  sourceFactIds: z.array(z.string()).min(1),
});

export const UncertaintySchema = z.object({
  id: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["info", "warning"]),
  factIds: z.array(z.string()),
});

export const ConflictSchema = z.object({
  id: z.string().min(1),
  message: z.string().min(1),
  severity: z.literal("conflict"),
  factIds: z.array(z.string()).min(2),
});

export const AnalysisSchema = z
  .object({
    version: z.literal("1.0"),
    sourceText: z.string().min(1),
    title: z.string().min(1),
    documentKind: z.enum([
      "bill",
      "travel",
      "notice",
      "medical",
      "school",
      "work",
      "event",
      "unknown",
    ]),
    confidence: z.number().min(0).max(1),
    facts: z.array(FactSchema),
    actions: z.array(ActionSchema),
    uncertainties: z.array(UncertaintySchema),
    conflicts: z.array(ConflictSchema),
  })
  .superRefine((analysis, context) => {
    for (const [index, fact] of analysis.facts.entries()) {
      const { quote, start, end } = fact.evidence;
      if (end <= start || analysis.sourceText.slice(start, end) !== quote) {
        context.addIssue({
          code: "custom",
          path: ["facts", index, "evidence"],
          message: "Evidence quote must exactly match sourceText at its offsets",
        });
      }
    }
  });

export type Evidence = z.infer<typeof EvidenceSchema>;
export type Fact = z.infer<typeof FactSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Uncertainty = z.infer<typeof UncertaintySchema>;
export type Conflict = z.infer<typeof ConflictSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;

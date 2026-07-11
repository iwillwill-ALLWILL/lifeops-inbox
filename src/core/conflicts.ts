import type { Conflict, Fact } from "./schema";

export function detectConflicts(facts: Fact[]): Conflict[] {
  const submissionDates = facts.filter(
    (fact) => fact.kind === "date" && /submission|portal closes/i.test(fact.label),
  );
  for (let left = 0; left < submissionDates.length; left += 1) {
    for (let right = left + 1; right < submissionDates.length; right += 1) {
      const first = submissionDates[left];
      const second = submissionDates[right];
      if (first.date?.iso === second.date?.iso) continue;

      const firstPortal = /portal closes/i.test(first.label);
      const secondPortal = /portal closes/i.test(second.label);
      const draftMilestone = /\bdraft\b/i.test(first.label) || /\bdraft\b/i.test(second.label);
      const sameLabel = first.label.trim().toLowerCase() === second.label.trim().toLowerCase();
      if (!sameLabel && (!(firstPortal || secondPortal) || draftMilestone)) continue;

      return [
        {
          id: "conflict-1",
          message: "Two submission deadlines conflict. Use the earlier portal-close time until the organizer confirms.",
          severity: "conflict",
          factIds: [first.id, second.id],
        },
      ];
    }
  }

  return [];
}

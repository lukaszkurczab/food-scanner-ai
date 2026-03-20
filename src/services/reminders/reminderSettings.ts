import type {
  ReminderDecision,
  ReminderDecisionResultStatus,
  ReminderDecisionSource,
} from "@/services/reminders/reminderTypes";

export type ReminderQaRow = {
  label: string;
  value: string;
};

function formatScheduleRange(scheduledAtUtc: string | null, validUntil: string): string {
  if (scheduledAtUtc === null) {
    return "n/a";
  }
  return `${scheduledAtUtc} -> ${validUntil}`;
}

function formatDecision(decision: ReminderDecision | null): ReminderQaRow[] {
  if (!decision) {
    return [
      { label: "decision", value: "n/a" },
      { label: "reasonCodes", value: "n/a" },
    ];
  }

  return [
    { label: "decision", value: decision.decision },
    { label: "kind", value: decision.kind ?? "n/a" },
    { label: "reasonCodes", value: decision.reasonCodes.join(", ") || "n/a" },
    {
      label: "schedule",
      value: formatScheduleRange(decision.scheduledAtUtc, decision.validUntil),
    },
    { label: "confidence", value: decision.confidence.toFixed(2) },
  ];
}

export function buildSmartReminderQaRows(input: {
  status: ReminderDecisionResultStatus;
  source: ReminderDecisionSource;
  enabled: boolean;
  decision: ReminderDecision | null;
  error: unknown | null;
}): ReminderQaRow[] {
  const rows: ReminderQaRow[] = [
    { label: "status", value: input.status },
    { label: "source", value: input.source },
    { label: "enabled", value: String(input.enabled) },
    ...formatDecision(input.decision),
  ];

  if (input.decision) {
    rows.splice(4, 0, { label: "dayKey", value: input.decision.dayKey });
  }

  if (input.error) {
    rows.push({
      label: "error",
      value: input.error instanceof Error ? input.error.message : "unknown",
    });
  }

  return rows;
}

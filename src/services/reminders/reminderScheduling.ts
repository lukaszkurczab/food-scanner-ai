import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getNotificationText } from "@/services/notifications/texts";
import {
  cancelAllForNotif,
  notificationScheduleKey,
  scheduleOneShotAt,
} from "@/services/notifications/localScheduler";
import {
  getCurrentReminderDecisionDayKey,
  getReminderDecision,
} from "@/services/reminders/reminderService";
import {
  trackSmartReminderNoop,
  trackSmartReminderScheduleFailed,
  toSmartReminderConfidenceBucket,
  toSmartReminderScheduledWindow,
  trackSmartReminderScheduled,
  trackSmartReminderSuppressed,
} from "@/services/telemetry/telemetryInstrumentation";
import type {
  ReminderDecision,
  ReminderDecisionResult,
} from "@/services/reminders/reminderTypes";
import { debugScope } from "@/utils/debug";

const log = debugScope("ReminderScheduling");
const SMART_REMINDER_KEY_PREFIX = "smart-reminder";
const MIN_SCHEDULE_LEAD_MS = 30_000;
const NOTIF_IDS_STORAGE_PREFIX = "notif:ids:";
export type ReminderSchedulingOutcome =
  | "scheduled"
  | "cancelled"
  | "skipped";

export type ReminderSchedulingResult = {
  outcome: ReminderSchedulingOutcome;
  localKey: string | null;
  result: ReminderDecisionResult;
};

function emitSmartReminderTelemetry(
  promise: Promise<void>,
  eventName: string,
  context: Record<string, unknown>,
): void {
  void promise.catch((error) => {
    log.warn(`${eventName} telemetry failed`, {
      ...context,
      error,
    });
  });
}

function createReminderLocalId(dayKey: string): string {
  return `${SMART_REMINDER_KEY_PREFIX}:${dayKey}`;
}

function createReminderScheduleLocalKeyPrefix(uid: string): string {
  return notificationScheduleKey(uid, SMART_REMINDER_KEY_PREFIX);
}

export function createReminderScheduleKey(uid: string, dayKey: string): string {
  return notificationScheduleKey(uid, createReminderLocalId(dayKey));
}

function resolveScheduledDate(
  decision: ReminderDecision,
  now: Date,
): Date | null {
  if (decision.scheduledAtUtc === null) {
    return null;
  }

  const scheduled = new Date(decision.scheduledAtUtc);
  if (Number.isNaN(scheduled.getTime())) {
    return null;
  }

  const validUntil = new Date(decision.validUntil);
  if (Number.isNaN(validUntil.getTime())) {
    return null;
  }

  const nextAllowed = new Date(now.getTime() + MIN_SCHEDULE_LEAD_MS);
  const when = scheduled > nextAllowed ? scheduled : nextAllowed;
  if (when > validUntil) {
    return null;
  }

  return when;
}

function getLocalMinuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function buildReminderContent(
  decision: ReminderDecision,
  scheduledWindow: ReturnType<typeof toSmartReminderScheduledWindow>,
) {
  const notificationType =
    decision.kind === "complete_day" ? "day_fill" : "meal_reminder";
  const text = getNotificationText(notificationType, "friendly");

  return {
    title: text.title,
    body: text.body,
    data: {
      type: notificationType,
      origin: "system_notifications",
      smartReminder: true,
      reminderKind: decision.kind,
      dayKey: decision.dayKey,
      scheduledWindow,
    },
  };
}

async function clearAndCancel(uid: string, dayKey: string, localKey: string): Promise<void> {
  await cancelAllForNotif(localKey);
}

export async function cancelReminderScheduling(
  uid: string,
  options?: { dayKey?: string | null },
): Promise<void> {
  const dayKey = options?.dayKey?.trim() || getCurrentReminderDecisionDayKey();
  await cancelAllForNotif(createReminderScheduleKey(uid, dayKey));
}

export async function cancelAllReminderScheduling(uid: string): Promise<void> {
  const localKeyPrefix = createReminderScheduleLocalKeyPrefix(uid);

  try {
    const keys = await AsyncStorage.getAllKeys();
    const localKeys = keys
      .filter((storageKey) =>
        storageKey.startsWith(`${NOTIF_IDS_STORAGE_PREFIX}${localKeyPrefix}:`)
      )
      .map((storageKey) => storageKey.slice(NOTIF_IDS_STORAGE_PREFIX.length));

    for (const localKey of new Set(localKeys)) {
      await cancelAllForNotif(localKey);
    }
  } catch (error) {
    log.warn("failed to cancel all smart reminder schedules", { uid, error });
  }
}

export async function reconcileReminderScheduling(
  uid: string,
  options?: { dayKey?: string | null; now?: Date },
): Promise<ReminderSchedulingResult> {
  const dayKey = options?.dayKey?.trim() || getCurrentReminderDecisionDayKey(options?.now);
  const localKey = createReminderScheduleKey(uid, dayKey);
  const now = options?.now ?? new Date();
  const result = await getReminderDecision(uid, { dayKey });

  if (result.status !== "live_success" || !result.decision) {
    await clearAndCancel(uid, dayKey, localKey);
    log.log("skip scheduling because reminder decision is unavailable", {
      uid,
      dayKey,
      status: result.status,
    });
    return {
      outcome: "cancelled",
      localKey,
      result,
    };
  }

  if (result.decision.decision !== "send") {
    await clearAndCancel(uid, dayKey, localKey);
    if (result.decision.decision === "suppress") {
      const suppressionReason = result.decision.reasonCodes[0];
      if (suppressionReason) {
        emitSmartReminderTelemetry(
          trackSmartReminderSuppressed({
            decision: "suppress",
            suppressionReason,
            confidenceBucket: toSmartReminderConfidenceBucket(
              result.decision.confidence,
            ),
          }),
          "smart_reminder_suppressed",
          {
            uid,
            dayKey,
            suppressionReason,
          },
        );
      }
    }
    if (result.decision.decision === "noop") {
      const noopReason = result.decision.reasonCodes[0];
      if (noopReason) {
        emitSmartReminderTelemetry(
          trackSmartReminderNoop({
            decision: "noop",
            noopReason,
            confidenceBucket: toSmartReminderConfidenceBucket(
              result.decision.confidence,
            ),
          }),
          "smart_reminder_noop",
          {
            uid,
            dayKey,
            noopReason,
          },
        );
      }
    }
    log.log("skip scheduling because reminder decision is non-send", {
      uid,
      dayKey,
      decision: result.decision.decision,
      reasonCodes: result.decision.reasonCodes,
    });
    return {
      outcome: "cancelled",
      localKey,
      result,
    };
  }

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    await clearAndCancel(uid, dayKey, localKey);
    emitSmartReminderTelemetry(
      trackSmartReminderScheduleFailed({
        reminderKind: result.decision.kind,
        decision: "send",
        confidenceBucket: toSmartReminderConfidenceBucket(
          result.decision.confidence,
        ),
        failureReason: "permission_unavailable",
      }),
      "smart_reminder_schedule_failed",
      {
        uid,
        dayKey,
        failureReason: "permission_unavailable",
      },
    );
    log.log("skip scheduling because notification permission is unavailable", {
      uid,
      dayKey,
    });
    return {
      outcome: "cancelled",
      localKey,
      result,
    };
  }

  const when = resolveScheduledDate(result.decision, now);
  if (!when) {
    await clearAndCancel(uid, dayKey, localKey);
    emitSmartReminderTelemetry(
      trackSmartReminderScheduleFailed({
        reminderKind: result.decision.kind,
        decision: "send",
        confidenceBucket: toSmartReminderConfidenceBucket(
          result.decision.confidence,
        ),
        failureReason: "invalid_time",
      }),
      "smart_reminder_schedule_failed",
      {
        uid,
        dayKey,
        failureReason: "invalid_time",
      },
    );
    log.warn("skip scheduling because reminder delivery time is invalid", {
      uid,
      dayKey,
      scheduledAtUtc: result.decision.scheduledAtUtc,
      validUntil: result.decision.validUntil,
    });
    return {
      outcome: "cancelled",
      localKey,
      result,
    };
  }

  await cancelAllForNotif(localKey);
  const scheduledWindow = toSmartReminderScheduledWindow(getLocalMinuteOfDay(when));
  try {
    await scheduleOneShotAt(
      when,
      buildReminderContent(result.decision, scheduledWindow),
      localKey,
    );
  } catch (error) {
    await clearAndCancel(uid, dayKey, localKey);
    emitSmartReminderTelemetry(
      trackSmartReminderScheduleFailed({
        reminderKind: result.decision.kind,
        decision: "send",
        confidenceBucket: toSmartReminderConfidenceBucket(
          result.decision.confidence,
        ),
        failureReason: "schedule_error",
      }),
      "smart_reminder_schedule_failed",
      {
        uid,
        dayKey,
        failureReason: "schedule_error",
      },
    );
    log.warn("smart reminder scheduling failed", {
      uid,
      dayKey,
      error,
    });
    return {
      outcome: "cancelled",
      localKey,
      result,
    };
  }
  emitSmartReminderTelemetry(
    trackSmartReminderScheduled({
      reminderKind: result.decision.kind,
      decision: "send",
      confidenceBucket: toSmartReminderConfidenceBucket(
        result.decision.confidence,
      ),
      scheduledWindow,
    }),
    "smart_reminder_scheduled",
    {
      uid,
      dayKey,
      reminderKind: result.decision.kind,
    },
  );
  log.log("scheduled smart reminder", {
    uid,
    dayKey,
    kind: result.decision.kind,
    when,
  });

  return {
    outcome: "scheduled",
    localKey,
    result,
  };
}

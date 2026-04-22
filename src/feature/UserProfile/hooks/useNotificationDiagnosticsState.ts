import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAndroidChannelDiagnostics,
  getNotificationEnvironmentDiagnostics,
  getNotificationPermissionDiagnostics,
  getScheduledNotificationsDiagnostics,
  type NotificationEnvironmentDiagnostics,
} from "@/services/notifications/notificationDiagnostics";
import { getNotificationPresentationPolicyDiagnostics } from "@/services/notifications/notificationPresentationPolicy";
import {
  getReminderStoredScheduleDiagnostics,
  type ReminderStoredScheduleDiagnostics,
} from "@/services/reminders/reminderScheduling";
import { getReminderRuntimeDiagnostics } from "@/services/reminders/reminderRuntime";

export type NotificationDiagnosticsState = {
  loading: boolean;
  refreshedAt: string | null;
  triage: string;
  environment: NotificationEnvironmentDiagnostics;
  permission: Awaited<ReturnType<typeof getNotificationPermissionDiagnostics>>;
  channel: Awaited<ReturnType<typeof getAndroidChannelDiagnostics>>;
  scheduled: Awaited<ReturnType<typeof getScheduledNotificationsDiagnostics>>;
  storedSchedules: ReminderStoredScheduleDiagnostics | null;
  runtime: ReturnType<typeof getReminderRuntimeDiagnostics>;
  foregroundPresentation: ReturnType<
    typeof getNotificationPresentationPolicyDiagnostics
  >;
  refresh: () => Promise<void>;
};

type PermissionDiagnostics = Awaited<
  ReturnType<typeof getNotificationPermissionDiagnostics>
>;
type ChannelDiagnostics = Awaited<ReturnType<typeof getAndroidChannelDiagnostics>>;
type ScheduledDiagnostics = Awaited<
  ReturnType<typeof getScheduledNotificationsDiagnostics>
>;

const INITIAL_PERMISSION: PermissionDiagnostics = {
  status: "unknown",
  granted: false,
  canAskAgain: null,
  requested: false,
  requestedAt: null,
  errorMessage: null,
};

const INITIAL_CHANNEL: ChannelDiagnostics = {
  platform: "non-android",
  channelId: "default",
  ensured: false,
  exists: null,
  errorMessage: null,
};

const INITIAL_SCHEDULED: ScheduledDiagnostics = {
  totalScheduled: 0,
  allIds: [],
  smartReminderIds: [],
  errorMessage: null,
};

function deriveTriage(params: {
  uid: string | null | undefined;
  environment: NotificationEnvironmentDiagnostics;
  permission: Awaited<ReturnType<typeof getNotificationPermissionDiagnostics>>;
  channel: Awaited<ReturnType<typeof getAndroidChannelDiagnostics>>;
  runtime: ReturnType<typeof getReminderRuntimeDiagnostics>;
  scheduled: Awaited<ReturnType<typeof getScheduledNotificationsDiagnostics>>;
  storedSchedules: ReminderStoredScheduleDiagnostics | null;
}): string {
  if (!params.uid) {
    return "noop:no_authenticated_user";
  }

  if (!params.environment.releaseSmokeSupported) {
    return `environment:not_testable:${params.environment.limitationReason ?? "unknown"}`;
  }

  if (!params.permission.granted) {
    return "blocked:permission_denied_or_ungranted";
  }

  if (
    params.channel.platform === "android" &&
    (!params.channel.ensured || params.channel.exists === false)
  ) {
    return "blocked:android_channel_unavailable";
  }

  const runtimeResult = params.runtime.lastResult;
  if (!runtimeResult) {
    return "pending:no_reconcile_result";
  }

  if (
    runtimeResult.reason === "scheduled" &&
    params.scheduled.smartReminderIds.length === 0 &&
    (params.storedSchedules?.totalIds ?? 0) === 0
  ) {
    return "failure:scheduled_without_visible_ids";
  }

  switch (runtimeResult.reason) {
    case "scheduled":
      return "ok:scheduled_waiting_for_os_delivery";
    case "decision_suppress":
      return "noop:suppress_from_backend";
    case "decision_noop":
      return "noop:noop_from_backend";
    case "decision_disabled":
      return "noop:smart_reminders_disabled";
    case "decision_no_user":
      return "noop:no_user_for_decision";
    case "decision_service_unavailable":
      return "blocked:backend_unavailable";
    case "decision_invalid_payload":
      return "blocked:backend_payload_invalid";
    case "permission_unavailable":
      return "blocked:permission_unavailable";
    case "channel_unavailable":
      return "blocked:android_channel_unavailable";
    case "invalid_time":
      return "blocked:invalid_schedule_time";
    case "schedule_error":
      return "failure:local_schedule_error";
    default:
      return "unknown";
  }
}

export function useNotificationDiagnosticsState(params: {
  uid: string | null | undefined;
  refreshKey?: string;
}): NotificationDiagnosticsState {
  const environment = useMemo(
    () => getNotificationEnvironmentDiagnostics(),
    [],
  );

  const [loading, setLoading] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [permission, setPermission] =
    useState<PermissionDiagnostics>(INITIAL_PERMISSION);
  const [channel, setChannel] = useState<ChannelDiagnostics>(INITIAL_CHANNEL);
  const [scheduled, setScheduled] =
    useState<ScheduledDiagnostics>(INITIAL_SCHEDULED);
  const [storedSchedules, setStoredSchedules] =
    useState<ReminderStoredScheduleDiagnostics | null>(null);
  const [runtime, setRuntime] = useState(getReminderRuntimeDiagnostics());
  const [foregroundPresentation, setForegroundPresentation] = useState(
    getNotificationPresentationPolicyDiagnostics(),
  );

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const [nextPermission, nextChannel, nextScheduled, nextStoredSchedules] =
        await Promise.all([
          getNotificationPermissionDiagnostics(),
          getAndroidChannelDiagnostics(),
          getScheduledNotificationsDiagnostics(),
          params.uid
            ? getReminderStoredScheduleDiagnostics(params.uid)
            : Promise.resolve(null),
        ]);

      setPermission(nextPermission);
      setChannel(nextChannel);
      setScheduled(nextScheduled);
      setStoredSchedules(nextStoredSchedules);
      setRuntime(getReminderRuntimeDiagnostics());
      setForegroundPresentation(getNotificationPresentationPolicyDiagnostics());
      setRefreshedAt(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, [params.uid]);

  useEffect(() => {
    void refresh();
  }, [refresh, params.refreshKey]);

  return {
    loading,
    refreshedAt,
    triage: deriveTriage({
      uid: params.uid,
      environment,
      permission,
      channel,
      runtime,
      scheduled,
      storedSchedules,
    }),
    environment,
    permission,
    channel,
    scheduled,
    storedSchedules,
    runtime,
    foregroundPresentation,
    refresh,
  };
}

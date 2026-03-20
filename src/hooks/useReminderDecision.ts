import { useCallback, useEffect, useState } from "react";
import {
  getCurrentReminderDecisionDayKey,
  getReminderDecision,
} from "@/services/reminders/reminderService";
import type {
  ReminderDecision,
  ReminderDecisionSource,
  ReminderDecisionResultStatus,
} from "@/services/reminders/reminderTypes";

type UseReminderDecisionParams = {
  uid: string | null | undefined;
  dayKey?: string | null;
  fetchEnabled?: boolean;
};

type ReminderDecisionState = {
  decision: ReminderDecision | null;
  loading: boolean;
  enabled: boolean;
  source: ReminderDecisionSource;
  status: ReminderDecisionResultStatus;
  error: unknown | null;
};

type UseReminderDecisionResult = ReminderDecisionState & {
  refresh: () => Promise<ReminderDecision | null>;
};

const INITIAL_STATE: ReminderDecisionState = {
  decision: null,
  loading: false,
  enabled: true,
  source: "fallback",
  status: "no_user",
  error: null,
};

function resolveDayKey(dayKey?: string | null): string {
  return dayKey?.trim() || getCurrentReminderDecisionDayKey();
}

export function useReminderDecision({
  uid,
  dayKey,
  fetchEnabled = true,
}: UseReminderDecisionParams): UseReminderDecisionResult {
  const resolvedDayKey = resolveDayKey(dayKey);
  const [state, setState] = useState<ReminderDecisionState>(
    () => ({ ...INITIAL_STATE, loading: !!uid }),
  );

  useEffect(() => {
    let active = true;

    if (!uid || !fetchEnabled) {
      setState(INITIAL_STATE);
      return () => {
        active = false;
      };
    }

    setState((prev) => ({ ...prev, loading: true }));

    void getReminderDecision(uid, { dayKey: resolvedDayKey }).then((result) => {
      if (!active) {
        return;
      }

      setState({
        decision: result.decision,
        loading: false,
        enabled: result.enabled,
        source: result.source,
        status: result.status,
        error: result.error,
      });
    });

    return () => {
      active = false;
    };
  }, [fetchEnabled, resolvedDayKey, uid]);

  const refresh = useCallback(async () => {
    const result = await getReminderDecision(uid, { dayKey: resolvedDayKey });
    setState({
      decision: result.decision,
      loading: false,
      enabled: result.enabled,
      source: result.source,
      status: result.status,
      error: result.error,
    });
    return result.decision;
  }, [resolvedDayKey, uid]);

  return {
    ...state,
    refresh,
  };
}

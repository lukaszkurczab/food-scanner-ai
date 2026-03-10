import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  INIT_STREAK,
  formatStreakDate,
  sanitizeStreakDoc,
} from "./streak.logic";
import { debugScope } from "@/utils/debug";
import { get, post } from "@/services/apiClient";
import { emit, on } from "@/services/events";
import type { StreakDoc } from "./streak.logic";
export type { StreakDoc } from "./streak.logic";

const log = debugScope("StreakService");
const streakGetInFlightByUid = new Map<string, Promise<StreakDoc>>();
const streakLatestByUid = new Map<string, StreakDoc>();

type StreakBackendResponse = {
  current: number;
  lastDate: string | null;
  awardedBadgeIds?: string[];
};

function streakCacheKey(uid: string) {
  return `streak:last:${uid}`;
}

function normalizeBackendStreak(
  payload: Partial<StreakBackendResponse> | null | undefined
): StreakDoc {
  return (
    sanitizeStreakDoc({
      current: payload?.current,
      lastDate: payload?.lastDate,
    }) || INIT_STREAK
  );
}

async function readStreakCache(uid: string): Promise<StreakDoc> {
  try {
    const raw = await AsyncStorage.getItem(streakCacheKey(uid));
    if (!raw) return INIT_STREAK;
    return sanitizeStreakDoc(JSON.parse(raw)) || INIT_STREAK;
  } catch {
    return INIT_STREAK;
  }
}

async function writeStreakCache(uid: string, streak: StreakDoc): Promise<void> {
  try {
    await AsyncStorage.setItem(streakCacheKey(uid), JSON.stringify(streak));
  } catch {
    // Ignore cache write failures for best-effort offline streak access.
  }
}

function emitStreakChange(
  uid: string,
  streak: StreakDoc,
  awardedBadgeIds: string[] = [],
  options?: { forceBadgeRefresh?: boolean },
) {
  streakLatestByUid.set(uid, streak);
  emit("streak:changed", { uid, streak });
  if (awardedBadgeIds.length > 0) {
    emit("badge:changed", { uid, awardedBadgeIds });
    return;
  }
  if (options?.forceBadgeRefresh) {
    emit("badge:changed", { uid });
  }
}

export async function ensureStreakDoc(uid: string) {
  const response = await post<StreakBackendResponse>(
    "/users/me/streak/ensure",
    { dayKey: formatStreakDate(new Date()) }
  );
  const streak = normalizeBackendStreak(response);
  await writeStreakCache(uid, streak);
  emitStreakChange(uid, streak, response.awardedBadgeIds || []);
  return streak;
}

export async function resetIfMissed(uid: string, now: Date = new Date()) {
  const response = await post<StreakBackendResponse>(
    "/users/me/streak/reset-if-missed",
    { dayKey: formatStreakDate(now) }
  );
  const streak = normalizeBackendStreak(response);
  await writeStreakCache(uid, streak);
  emitStreakChange(uid, streak, response.awardedBadgeIds || []);
  return streak;
}

export async function updateStreakIfThresholdMet(params: {
  uid: string;
  todaysKcal: number;
  targetKcal: number;
  now?: Date;
  thresholdPct?: number;
}) {
  const { uid, todaysKcal, targetKcal } = params;
  const now = params.now ?? new Date();
  const thresholdPct = params.thresholdPct ?? 0.8;

  const response = await post<StreakBackendResponse>(
    "/users/me/streak/recalculate",
    {
      dayKey: formatStreakDate(now),
      todaysKcal,
      targetKcal,
      thresholdPct,
    }
  );

  const streak = normalizeBackendStreak(response);
  await writeStreakCache(uid, streak);
  emitStreakChange(uid, streak, response.awardedBadgeIds || []);
  return streak;
}

export async function getStreak(uid: string) {
  const existing = streakGetInFlightByUid.get(uid);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    try {
      void uid;
      const response = await get<StreakBackendResponse>("/users/me/streak");
      const streak = normalizeBackendStreak(response);
      await writeStreakCache(uid, streak);
      streakLatestByUid.set(uid, streak);
      return streak;
    } catch (error) {
      log.warn("getStreak backend error", { uid, error });
      const cached = await readStreakCache(uid);
      streakLatestByUid.set(uid, cached);
      return cached;
    }
  })();

  streakGetInFlightByUid.set(uid, request);

  try {
    return await request;
  } finally {
    const current = streakGetInFlightByUid.get(uid);
    if (current === request) {
      streakGetInFlightByUid.delete(uid);
    }
  }
}

export async function refreshStreakFromBackend(
  uid: string,
  options?: { refreshBadges?: boolean },
) {
  const streak = await getStreak(uid);
  emitStreakChange(uid, streak, [], { forceBadgeRefresh: options?.refreshBadges });
  return streak;
}

export function subscribeStreak(
  uid: string,
  cb: (data: StreakDoc) => void
) {
  let active = true;

  const publish = async (next?: StreakDoc) => {
    if (!active) return;
    if (next) {
      streakLatestByUid.set(uid, next);
      cb(next);
      return;
    }

    const latest = streakLatestByUid.get(uid);
    if (latest) {
      cb(latest);
      return;
    }

    const cached = await readStreakCache(uid);
    if (!active) return;
    streakLatestByUid.set(uid, cached);
    cb(cached);
  };

  void publish();

  const unsubscribe = on<{ uid?: string; streak?: StreakDoc }>(
    "streak:changed",
    (payload) => {
      if (!active) return;
      if (payload?.uid !== uid) return;
      const next = sanitizeStreakDoc(payload?.streak) || undefined;
      void publish(next);
    },
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

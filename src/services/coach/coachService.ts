import AsyncStorage from "@react-native-async-storage/async-storage";
import { get } from "@/services/core/apiClient";
import { withV2 } from "@/services/core/apiVersioning";
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  isRecord,
} from "@/services/contracts/guards";
import { readPublicEnv } from "@/services/core/publicEnv";
import { debugScope } from "@/utils/debug";
import type {
  CoachActionType,
  CoachEmptyReason,
  CoachInsight,
  CoachInsightType,
  CoachMeta,
  CoachResponse,
  CoachResult,
  CoachSource,
} from "@/services/coach/coachTypes";

const log = debugScope("CoachService");
const COACH_ENDPOINT = withV2("/users/me/coach");

export const COACH_STORAGE_KEY_PREFIX = "coach:last:v1";

const memoryCacheByKey = new Map<string, CoachResponse>();
const inFlightByKey = new Map<string, { promise: Promise<CoachResult> }>();

function isCoachEnabled(): boolean {
  return readPublicEnv("EXPO_PUBLIC_ENABLE_V2_STATE") === "true";
}

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentCoachDayKey(now: Date = new Date()): string {
  return toDayKey(now);
}

function normalizeDayKey(dayKey?: string | null): string {
  const normalized = dayKey?.trim();
  return normalized || getCurrentCoachDayKey();
}

function createComputedAt(): string {
  return new Date().toISOString();
}

function createCacheKey(uid: string, dayKey: string): string {
  return `${uid}:${dayKey}`;
}

function createStorageKey(uid: string, dayKey: string): string {
  return `${COACH_STORAGE_KEY_PREFIX}:${uid}:${dayKey}`;
}

function createStorageKeyPrefix(uid: string): string {
  return `${COACH_STORAGE_KEY_PREFIX}:${uid}:`;
}

function buildEndpoint(dayKey: string): string {
  return `${COACH_ENDPOINT}?day=${encodeURIComponent(dayKey)}`;
}

function toCoachInsightType(value: unknown): CoachInsightType {
  switch (value) {
    case "under_logging":
    case "high_unknown_meal_details":
    case "low_protein_consistency":
    case "calorie_under_target":
    case "positive_momentum":
    case "stable":
      return value;
    default:
      return "stable";
  }
}

function toCoachActionType(value: unknown): CoachActionType {
  switch (value) {
    case "log_next_meal":
    case "open_chat":
    case "review_history":
    case "none":
      return value;
    default:
      return "none";
  }
}

function toCoachSource(value: unknown): CoachSource {
  return value === "rules" ? value : "rules";
}

function toCoachEmptyReason(value: unknown): CoachEmptyReason | null {
  switch (value) {
    case "no_data":
    case "insufficient_data":
      return value;
    default:
      return null;
  }
}

function normalizeCoachInsight(value: unknown): CoachInsight | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: asString(value.id) ?? "",
    type: toCoachInsightType(value.type),
    priority: Math.max(asNumber(value.priority) ?? 0, 0),
    title: asString(value.title) ?? "",
    body: asString(value.body) ?? "",
    actionLabel: asString(value.actionLabel) ?? null,
    actionType: toCoachActionType(value.actionType),
    reasonCodes: asStringArray(value.reasonCodes),
    source: toCoachSource(value.source),
    validUntil: asString(value.validUntil) ?? null,
    confidence: Math.min(Math.max(asNumber(value.confidence) ?? 0, 0), 1),
    isPositive: asBoolean(value.isPositive) ?? false,
  };
}

function normalizeCoachMeta(value: unknown): CoachMeta {
  const payload = isRecord(value) ? value : {};
  return {
    available: asBoolean(payload.available) ?? false,
    emptyReason: toCoachEmptyReason(payload.emptyReason),
    isDegraded: asBoolean(payload.isDegraded) ?? false,
  };
}

export function createFallbackCoachResponse(dayKey?: string | null): CoachResponse {
  return {
    dayKey: normalizeDayKey(dayKey),
    computedAt: createComputedAt(),
    source: "rules",
    insights: [],
    topInsight: null,
    meta: {
      available: false,
      emptyReason: null,
      isDegraded: false,
    },
  };
}

export function normalizeCoachResponse(
  value: unknown,
  fallbackDayKey?: string | null,
): CoachResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const dayKey = asString(value.dayKey) ?? normalizeDayKey(fallbackDayKey);
  const insights = Array.isArray(value.insights)
    ? value.insights
      .map((item) => normalizeCoachInsight(item))
      .filter((item): item is CoachInsight => item !== null)
      .slice(0, 3)
    : [];
  const topInsight = normalizeCoachInsight(value.topInsight);

  return {
    dayKey,
    computedAt: asString(value.computedAt) ?? createComputedAt(),
    source: toCoachSource(value.source),
    insights,
    topInsight,
    meta: normalizeCoachMeta(value.meta),
  };
}

async function persistCoach(uid: string, dayKey: string, coach: CoachResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(createStorageKey(uid, dayKey), JSON.stringify(coach));
  } catch {
    // Ignore storage write failures for best-effort cache.
  }
}

async function readPersistedCoach(
  uid: string,
  dayKey: string,
): Promise<CoachResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(createStorageKey(uid, dayKey));
    if (!raw) {
      return null;
    }
    return normalizeCoachResponse(JSON.parse(raw) as unknown, dayKey);
  } catch {
    return null;
  }
}

export async function getCoach(
  uid: string | null | undefined,
  options?: { dayKey?: string | null; force?: boolean },
): Promise<CoachResult> {
  const dayKey = normalizeDayKey(options?.dayKey);
  const fallbackCoach = createFallbackCoachResponse(dayKey);

  if (!isCoachEnabled()) {
    return {
      coach: fallbackCoach,
      source: "disabled",
      enabled: false,
      isStale: true,
      error: null,
    };
  }

  if (!uid) {
    return {
      coach: fallbackCoach,
      source: "fallback",
      enabled: true,
      isStale: true,
      error: null,
    };
  }

  const cacheKey = createCacheKey(uid, dayKey);
  if (!options?.force) {
    const memory = memoryCacheByKey.get(cacheKey);
    if (memory) {
      return {
        coach: memory,
        source: "memory",
        enabled: true,
        isStale: false,
        error: null,
      };
    }

    const existing = inFlightByKey.get(cacheKey);
    if (existing) {
      return existing.promise;
    }
  }

  const entry = {} as { promise: Promise<CoachResult> };
  entry.promise = (async (): Promise<CoachResult> => {
    try {
      const payload = await get<unknown>(buildEndpoint(dayKey), { timeout: 15_000 });
      const normalized = normalizeCoachResponse(payload, dayKey);
      if (!normalized) {
        throw new Error("Invalid coach payload");
      }

      memoryCacheByKey.set(cacheKey, normalized);
      await persistCoach(uid, dayKey, normalized);

      return {
        coach: normalized,
        source: "remote",
        enabled: true,
        isStale: false,
        error: null,
      };
    } catch (error) {
      log.warn("getCoach backend error", { uid, dayKey, error });

      const memory = memoryCacheByKey.get(cacheKey);
      if (memory) {
        return {
          coach: memory,
          source: "memory",
          enabled: true,
          isStale: true,
          error,
        };
      }

      const persisted = await readPersistedCoach(uid, dayKey);
      if (persisted) {
        memoryCacheByKey.set(cacheKey, persisted);
        return {
          coach: persisted,
          source: "storage",
          enabled: true,
          isStale: true,
          error,
        };
      }

      return {
        coach: fallbackCoach,
        source: "fallback",
        enabled: true,
        isStale: true,
        error,
      };
    } finally {
      const current = inFlightByKey.get(cacheKey);
      if (current === entry) {
        inFlightByKey.delete(cacheKey);
      }
    }
  })();

  inFlightByKey.set(cacheKey, entry);
  return entry.promise;
}

export function refreshCoach(
  uid: string | null | undefined,
  options?: { dayKey?: string | null },
): Promise<CoachResult> {
  return getCoach(uid, { ...options, force: true });
}

export async function invalidateCoachCache(
  uid: string | null | undefined,
  options?: { dayKey?: string | null },
): Promise<void> {
  if (!uid) {
    return;
  }

  const normalizedDayKey = options?.dayKey?.trim();
  if (normalizedDayKey) {
    memoryCacheByKey.delete(createCacheKey(uid, normalizedDayKey));
    try {
      await AsyncStorage.removeItem(createStorageKey(uid, normalizedDayKey));
    } catch {
      // Ignore cache invalidation failures for best-effort refresh behavior.
    }
    return;
  }

  for (const cacheKey of Array.from(memoryCacheByKey.keys())) {
    if (cacheKey.startsWith(`${uid}:`)) {
      memoryCacheByKey.delete(cacheKey);
    }
  }

  try {
    const storageKeys = await AsyncStorage.getAllKeys();
    const matchingKeys = storageKeys.filter((key) =>
      key.startsWith(createStorageKeyPrefix(uid)),
    );
    if (matchingKeys.length > 0) {
      await AsyncStorage.multiRemove(matchingKeys);
    }
  } catch {
    // Ignore cache invalidation failures for best-effort refresh behavior.
  }
}

export function __resetCoachServiceForTests(): void {
  memoryCacheByKey.clear();
  inFlightByKey.clear();
}

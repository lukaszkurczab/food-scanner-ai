import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { Filters } from "@/context/HistoryContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { resolveDataViewState } from "@/types/dataViewState";
import {
  getMealByCloudIdLocal,
  getMealsPageLocalFiltered,
  type LocalHistoryFilters,
} from "@/services/offline/meals.repo";
import { pullChanges } from "@/services/offline/sync.engine";
import { on } from "@/services/core/events";
import type { DaySection } from "@/feature/History/types/daySection";
import {
  addOrUpdateMealInSections,
  buildSectionsMap,
  filterSectionsByQuery,
  removeMealFromSections,
} from "@/feature/History/services/historySectionsService";
import { resolveDateRangeWithinAccessWindow } from "@/utils/accessWindow";

const PAGE = 20;
const PULL_THROTTLE_MS = 30_000;

export type HistoryErrorKind = "load" | "sync" | null;

function getMealTimestamp(meal: { timestamp?: unknown; updatedAt?: unknown; createdAt?: unknown }) {
  const raw = meal.timestamp ?? meal.updatedAt ?? meal.createdAt;
  const parsed = new Date(raw as string | number | Date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isMealInDateRange(
  meal: { timestamp?: unknown; updatedAt?: unknown; createdAt?: unknown },
  dateRange?: { start: Date; end: Date },
) {
  if (!dateRange) return true;
  const timestamp = getMealTimestamp(meal);
  if (!timestamp) return false;
  const ts = timestamp.getTime();
  return ts >= dateRange.start.getTime() && ts <= dateRange.end.getTime();
}

export function useHistorySectionsData(params: {
  uid: string | null | undefined;
  query: string;
  filters: Filters | null;
  accessWindowDays?: number;
  todayLabel: string;
  yesterdayLabel: string;
  locale?: string;
  isOnline: boolean;
}) {
  const debouncedQuery = useDebouncedValue(params.query, 220);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorKind, setErrorKind] = useState<HistoryErrorKind>(null);
  const [sectionsMap, setSectionsMap] = useState<Map<string, DaySection>>(
    () => new Map(),
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadingMoreRef = useRef(false);
  const firstFocus = useRef(true);
  const pullInFlightRef = useRef(false);
  const pullPendingRef = useRef(false);
  const lastPullRequestedAtRef = useRef(0);
  const firstPageRequestIdRef = useRef(0);
  const loadMoreRequestIdRef = useRef(0);

  const localFilters: LocalHistoryFilters | undefined = useMemo(() => {
    const dateRange = resolveDateRangeWithinAccessWindow(
      params.filters?.dateRange
        ? {
            start: new Date(params.filters.dateRange.start),
            end: new Date(params.filters.dateRange.end),
          }
        : undefined,
      params.accessWindowDays,
    );

    if (!params.filters && !dateRange) return undefined;

    return {
      calories: params.filters?.calories,
      protein: params.filters?.protein,
      carbs: params.filters?.carbs,
      fat: params.filters?.fat,
      dateRange,
    };
  }, [params.accessWindowDays, params.filters]);

  const requestScopeKey = useMemo(
    () =>
      JSON.stringify({
        uid: params.uid,
        localFilters,
        todayLabel: params.todayLabel,
        yesterdayLabel: params.yesterdayLabel,
        locale: params.locale,
      }),
    [
      localFilters,
      params.locale,
      params.todayLabel,
      params.uid,
      params.yesterdayLabel,
    ],
  );
  const requestScopeKeyRef = useRef(requestScopeKey);

  useEffect(() => {
    requestScopeKeyRef.current = requestScopeKey;
    loadMoreRequestIdRef.current += 1;
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [requestScopeKey]);

  const resetAndLoadLocal = useCallback(async () => {
    const requestScope = requestScopeKey;
    const requestId = ++firstPageRequestIdRef.current;
    const isStale = () =>
      firstPageRequestIdRef.current !== requestId || requestScopeKeyRef.current !== requestScope;

    if (!params.uid) {
      setSectionsMap(new Map());
      setCursor(null);
      setHasMore(false);
      setErrorKind(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const page = await getMealsPageLocalFiltered(params.uid, {
        limit: PAGE,
        beforeISO: null,
        filters: localFilters,
      });
      if (isStale()) return;
      setSectionsMap(
        buildSectionsMap(page.items, {
          todayLabel: params.todayLabel,
          yesterdayLabel: params.yesterdayLabel,
          locale: params.locale,
        }),
      );
      setCursor(page.nextBefore);
      setHasMore(!!page.nextBefore && page.items.length === PAGE);
      setErrorKind(null);
    } catch {
      if (isStale()) return;
      setErrorKind("load");
    } finally {
      if (!isStale()) {
        setLoading(false);
      }
    }
  }, [
    localFilters,
    params.locale,
    params.todayLabel,
    params.uid,
    params.yesterdayLabel,
    requestScopeKey,
  ]);

  const requestPullChanges = useCallback(async (options?: { force?: boolean }) => {
    if (!params.uid) return;
    const requestScope = requestScopeKeyRef.current;
    const isStale = () => requestScopeKeyRef.current !== requestScope;
    if (pullInFlightRef.current) {
      pullPendingRef.current = true;
      return;
    }
    const now = Date.now();
    if (!options?.force) {
      if (now - lastPullRequestedAtRef.current < PULL_THROTTLE_MS) return;
    }
    lastPullRequestedAtRef.current = now;

    pullInFlightRef.current = true;
    try {
      await pullChanges(params.uid);
      if (!isStale()) {
        setErrorKind(null);
      }
    } catch {
      if (!isStale()) {
        setErrorKind("sync");
      }
    } finally {
      pullInFlightRef.current = false;
      if (pullPendingRef.current) {
        pullPendingRef.current = false;
        void requestPullChanges({ force: true });
      }
    }
  }, [params.uid]);

  useEffect(() => {
    pullInFlightRef.current = false;
    pullPendingRef.current = false;
    lastPullRequestedAtRef.current = 0;
  }, [params.uid]);

  useEffect(() => {
    void resetAndLoadLocal();
  }, [params.uid, resetAndLoadLocal]);

  const prevKey = useRef<string>("");
  useEffect(() => {
    const key = JSON.stringify({
      uid: params.uid,
      localFilters,
      accessWindowDays: params.accessWindowDays,
    });
    if (!params.uid || key === prevKey.current) return;
    prevKey.current = key;
    void requestPullChanges({ force: true });
  }, [params.accessWindowDays, params.uid, localFilters, requestPullChanges]);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void requestPullChanges();
    }, [requestPullChanges]),
  );

  useEffect(() => {
    const uid = params.uid;
    if (!uid) return;

    const up = on<{ cloudId?: string }>("meal:local:upserted", async (event) => {
      const id = String(event?.cloudId || "");
      if (!id) return;

      const meal = await getMealByCloudIdLocal(uid, id);
      if (!meal || meal.deleted) return;

      if (!isMealInDateRange(meal, localFilters?.dateRange)) {
        setSectionsMap((prev) => {
          const next = new Map(prev);
          removeMealFromSections(next, id);
          return next;
        });
        return;
      }

      setSectionsMap((prev) => {
        const next = new Map(prev);
        addOrUpdateMealInSections(next, meal, {
          todayLabel: params.todayLabel,
          yesterdayLabel: params.yesterdayLabel,
          locale: params.locale,
        });
        return next;
      });
    });

    const del = on<{ cloudId?: string }>("meal:local:deleted", async (event) => {
      const id = String(event?.cloudId || "");
      if (!id) return;

      setSectionsMap((prev) => {
        const next = new Map(prev);
        removeMealFromSections(next, id);
        return next;
      });
    });

    return () => {
      [up, del].forEach((unsub) => unsub && unsub());
    };
  }, [
    localFilters?.dateRange,
    params.locale,
    params.todayLabel,
    params.uid,
    params.yesterdayLabel,
  ]);

  const loadMore = useCallback(async () => {
    if (!params.uid || !hasMore || loadingMoreRef.current || !cursor) return;

    const requestScope = requestScopeKey;
    const requestId = ++loadMoreRequestIdRef.current;
    const isStale = () =>
      loadMoreRequestIdRef.current !== requestId || requestScopeKeyRef.current !== requestScope;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await getMealsPageLocalFiltered(params.uid, {
        limit: PAGE,
        beforeISO: cursor,
        filters: localFilters,
      });
      if (isStale()) return;
      setSectionsMap((prev) => {
        const next = new Map(prev);
        for (const meal of page.items) {
          addOrUpdateMealInSections(next, meal, {
            todayLabel: params.todayLabel,
            yesterdayLabel: params.yesterdayLabel,
            locale: params.locale,
          });
        }
        return next;
      });
      setCursor(page.nextBefore);
      setHasMore(!!page.nextBefore && page.items.length === PAGE);
    } finally {
      if (!isStale()) {
        setLoadingMore(false);
        setTimeout(() => {
          if (!isStale()) {
            loadingMoreRef.current = false;
          }
        }, 50);
      }
    }
  }, [
    cursor,
    hasMore,
    localFilters,
    params.locale,
    params.todayLabel,
    params.uid,
    params.yesterdayLabel,
    requestScopeKey,
  ]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMoreRef.current) return;
    void loadMore();
  }, [hasMore, loadMore]);

  const refresh = useCallback(async () => {
    await requestPullChanges({ force: true });
  }, [requestPullChanges]);

  const sections = useMemo(
    () =>
      filterSectionsByQuery({
        sectionsMap,
        query: debouncedQuery,
      }),
    [debouncedQuery, sectionsMap],
  );

  const dataState = resolveDataViewState({
    isLoading: loading,
    hasData: sections.length > 0,
    isOnline: params.isOnline,
    hasError: !!errorKind,
  });

  return {
    loading,
    loadingMore,
    errorKind,
    sections,
    dataState,
    onEndReached,
    refresh,
  };
}

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

const PAGE = 20;
const PULL_THROTTLE_MS = 30_000;

export type HistoryErrorKind = "load" | "sync" | null;

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

  const localFilters: LocalHistoryFilters | undefined = useMemo(() => {
    if (!params.filters) return undefined;
    return {
      calories: params.filters.calories,
      protein: params.filters.protein,
      carbs: params.filters.carbs,
      fat: params.filters.fat,
      dateRange: params.filters.dateRange
        ? {
            start: new Date(params.filters.dateRange.start),
            end: new Date(params.filters.dateRange.end),
          }
        : undefined,
    };
  }, [params.filters]);

  const resetAndLoadLocal = useCallback(async () => {
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
      setErrorKind("load");
    } finally {
      setLoading(false);
    }
  }, [
    localFilters,
    params.locale,
    params.todayLabel,
    params.uid,
    params.yesterdayLabel,
  ]);

  const requestPullChanges = useCallback(async (options?: { force?: boolean }) => {
    if (!params.uid) return;
    if (pullInFlightRef.current) {
      pullPendingRef.current = true;
      return;
    }
    if (!options?.force) {
      const now = Date.now();
      if (now - lastPullRequestedAtRef.current < PULL_THROTTLE_MS) return;
      lastPullRequestedAtRef.current = now;
    }

    pullInFlightRef.current = true;
    try {
      await pullChanges(params.uid);
      setErrorKind(null);
    } catch {
      setErrorKind("sync");
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
  }, [params.locale, params.todayLabel, params.uid, params.yesterdayLabel]);

  const loadMore = useCallback(async () => {
    if (!params.uid || !hasMore || loadingMoreRef.current || !cursor) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await getMealsPageLocalFiltered(params.uid, {
        limit: PAGE,
        beforeISO: cursor,
        filters: localFilters,
      });
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
      setLoadingMore(false);
      setTimeout(() => {
        loadingMoreRef.current = false;
      }, 50);
    }
  }, [
    cursor,
    hasMore,
    localFilters,
    params.locale,
    params.todayLabel,
    params.uid,
    params.yesterdayLabel,
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

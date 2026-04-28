import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Filters } from "@/context/HistoryContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { resolveDataViewState } from "@/types/dataViewState";
import {
  type LocalHistoryFilters,
} from "@/services/offline/meals.repo";
import type { DaySection } from "@/feature/History/types/daySection";
import {
  addOrUpdateMealInSections,
  buildSectionsMap,
  filterSectionsByQuery,
} from "@/feature/History/services/historySectionsService";
import { resolveDateRangeWithinAccessWindow } from "@/utils/accessWindow";
import {
  getLocalMealsSnapshot,
  refreshLocalMeals,
  selectLocalMealsByRange,
  subscribeLocalMeals,
} from "@/services/meals/localMealsStore";

const PAGE = 20;

export type HistoryErrorKind = "load" | "sync" | null;

function mealNutrientValue(
  meal: { totals?: { kcal?: number; protein?: number; carbs?: number; fat?: number } },
  key: "kcal" | "protein" | "carbs" | "fat",
): number {
  return Number(meal.totals?.[key] ?? 0) || 0;
}

function inRange(value: number, range?: [number, number]): boolean {
  if (!range) return true;
  return value >= range[0] && value <= range[1];
}

function getFilteredLocalMeals(
  uid: string,
  filters?: LocalHistoryFilters,
) {
  const source = filters?.dateRange
    ? selectLocalMealsByRange(uid, filters.dateRange)
    : getLocalMealsSnapshot(uid).meals;

  return source.filter((meal) => {
    return (
      inRange(mealNutrientValue(meal, "kcal"), filters?.calories) &&
      inRange(mealNutrientValue(meal, "protein"), filters?.protein) &&
      inRange(mealNutrientValue(meal, "carbs"), filters?.carbs) &&
      inRange(mealNutrientValue(meal, "fat"), filters?.fat)
    );
  });
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
      const items = getFilteredLocalMeals(params.uid, localFilters);
      const pageItems = items.slice(0, PAGE);
      if (isStale()) return;
      setSectionsMap(
        buildSectionsMap(pageItems, {
          todayLabel: params.todayLabel,
          yesterdayLabel: params.yesterdayLabel,
          locale: params.locale,
        }),
      );
      setCursor(items.length > PAGE ? String(PAGE) : null);
      setHasMore(items.length > PAGE);
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
  const resetAndLoadLocalRef = useRef(resetAndLoadLocal);

  useEffect(() => {
    resetAndLoadLocalRef.current = resetAndLoadLocal;
  }, [resetAndLoadLocal]);

  useEffect(() => {
    void resetAndLoadLocal();
  }, [resetAndLoadLocal]);

  useEffect(() => {
    if (!params.uid) return undefined;
    return subscribeLocalMeals(params.uid, () => {
      void resetAndLoadLocalRef.current();
    });
  }, [params.uid]);

  const loadMore = useCallback(async () => {
    if (!params.uid || !hasMore || loadingMoreRef.current || !cursor) return;

    const requestScope = requestScopeKey;
    const requestId = ++loadMoreRequestIdRef.current;
    const isStale = () =>
      loadMoreRequestIdRef.current !== requestId || requestScopeKeyRef.current !== requestScope;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const offset = Number(cursor) || 0;
      const items = getFilteredLocalMeals(params.uid, localFilters);
      const pageItems = items.slice(offset, offset + PAGE);
      if (isStale()) return;
      setSectionsMap((prev) => {
        const next = new Map(prev);
        for (const meal of pageItems) {
          addOrUpdateMealInSections(next, meal, {
            todayLabel: params.todayLabel,
            yesterdayLabel: params.yesterdayLabel,
            locale: params.locale,
          });
        }
        return next;
      });
      const nextOffset = offset + pageItems.length;
      setCursor(items.length > nextOffset ? String(nextOffset) : null);
      setHasMore(items.length > nextOffset);
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
    await refreshLocalMeals(params.uid);
    await resetAndLoadLocal();
  }, [params.uid, resetAndLoadLocal]);

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

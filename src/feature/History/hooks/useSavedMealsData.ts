import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ViewToken } from "react-native";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { resolveDataViewState } from "@/types/dataViewState";
import type { Meal } from "@/types/meal";
import type { Filters } from "@/context/HistoryContext";
import {
  deleteSavedMeal,
  fetchSavedMealsPage,
  subscribeSavedMealsFirstPage,
  type SavedMealsCursor,
} from "@/feature/History/services/savedMealsService";

const PAGE_SIZE = 20;

const normalizeText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getMealTotals = (meal: Meal) => {
  const ingredients = meal.ingredients || [];
  const sumBy = <K extends "kcal" | "protein" | "carbs" | "fat">(key: K) =>
    ingredients.reduce((acc, item) => acc + toNumber(item?.[key]), 0);
  return {
    kcal: sumBy("kcal"),
    protein: sumBy("protein"),
    carbs: sumBy("carbs"),
    fat: sumBy("fat"),
  };
};

const toDate = (value?: string | number | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const getMealDate = (meal: Meal): Date | null =>
  toDate(meal.timestamp) || toDate(meal.updatedAt) || toDate(meal.createdAt);

function filterVisibleSavedMeals(params: {
  items: Meal[];
  query: string;
  filters: Filters | null;
}): Meal[] {
  const sortedItems = [...params.items].sort((a, b) => {
    const aName = normalizeText(a.name || "");
    const bName = normalizeText(b.name || "");
    if (aName && bName) return aName.localeCompare(bName);
    if (aName && !bName) return -1;
    if (!aName && bName) return 1;
    return 0;
  });

  const searchIndex = new Map<string, string>();
  for (const meal of sortedItems) {
    const id = String(meal.cloudId || meal.mealId);
    const title = normalizeText(meal.name || "");
    const ingredients = normalizeText(
      (meal.ingredients || []).map((ingredient) => ingredient?.name || "").join(" "),
    );
    searchIndex.set(id, `${title} ${ingredients}`.trim());
  }

  const normalizedQuery = normalizeText(params.query);
  const textFiltered = !normalizedQuery
    ? sortedItems
    : sortedItems.filter((meal) => {
        const id = String(meal.cloudId || meal.mealId);
        const text = searchIndex.get(id) || "";
        return text.includes(normalizedQuery);
      });

  if (!params.filters) return textFiltered;

  const bounds = params.filters.dateRange
    ? {
        start: new Date(params.filters.dateRange.start),
        end: new Date(params.filters.dateRange.end),
      }
    : null;
  if (bounds) {
    bounds.start.setHours(0, 0, 0, 0);
    bounds.end.setHours(23, 59, 59, 999);
  }

  return textFiltered.filter((meal) => {
    const totals = getMealTotals(meal);

    if (params.filters?.calories) {
      const [min, max] = params.filters.calories;
      if (totals.kcal < min || totals.kcal > max) return false;
    }
    if (params.filters?.protein) {
      const [min, max] = params.filters.protein;
      if (totals.protein < min || totals.protein > max) return false;
    }
    if (params.filters?.carbs) {
      const [min, max] = params.filters.carbs;
      if (totals.carbs < min || totals.carbs > max) return false;
    }
    if (params.filters?.fat) {
      const [min, max] = params.filters.fat;
      if (totals.fat < min || totals.fat > max) return false;
    }
    if (bounds) {
      const date = getMealDate(meal);
      if (date && (+date < +bounds.start || +date > +bounds.end)) return false;
    }

    return true;
  });
}

export type SavedMealsErrorKind = "load" | "loadMore" | "refresh" | null;

export function useSavedMealsData(params: {
  uid: string | null | undefined;
  query: string;
  filters: Filters | null;
  isOnline: boolean;
  syncSavedMeals: () => Promise<void>;
}) {
  const { syncSavedMeals } = params;
  const debouncedQuery = useDebouncedValue(params.query, 220);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<Meal[]>([]);
  const [lastDoc, setLastDoc] = useState<SavedMealsCursor>(null);
  const [hasMore, setHasMore] = useState(true);
  const [validating, setValidating] = useState(false);
  const [errorKind, setErrorKind] = useState<SavedMealsErrorKind>(null);

  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(hasMore);
  const lastDocRef = useRef(lastDoc);
  const visibleCountRef = useRef(0);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    if (!params.uid) {
      setItems([]);
      setLastDoc(null);
      setHasMore(false);
      setLoading(false);
      setErrorKind(null);
      return;
    }

    setLoading(true);
    setValidating(true);
    refreshInFlightRef.current = false;
    const unsub = subscribeSavedMealsFirstPage({
      uid: params.uid,
      pageSize: PAGE_SIZE,
      onData: (page) => {
        setItems(page.items);
        setLastDoc(page.lastDoc);
        setHasMore(page.hasMore);
        setLoading(false);
        setValidating(false);
        setErrorKind(null);
      },
      onError: () => {
        setLoading(false);
        setValidating(false);
        setErrorKind("load");
      },
    });

    return () => {
      refreshInFlightRef.current = false;
      if (typeof unsub === "function") unsub();
    };
  }, [params.uid]);

  useEffect(() => {
    if (!params.uid || !params.isOnline) {
      setValidating(false);
      return;
    }
    if (refreshInFlightRef.current) {
      return;
    }

    let active = true;
    refreshInFlightRef.current = true;
    setValidating(true);

    void syncSavedMeals()
      .catch(() => {
        if (active) {
          setErrorKind((current) => current ?? "refresh");
        }
      })
      .finally(() => {
        refreshInFlightRef.current = false;
        if (active) {
          setValidating(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params.isOnline, params.uid, syncSavedMeals]);

  const loadMore = useCallback(async () => {
    if (!params.uid || !hasMore || loadingMoreRef.current || !lastDoc) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchSavedMealsPage({
        uid: params.uid,
        pageSize: PAGE_SIZE,
        lastDoc,
      });
      setItems((prev) => [...prev, ...page.items]);
      setLastDoc(page.lastDoc);
      setHasMore(page.hasMore);
      setErrorKind(null);
    } catch {
      setErrorKind("loadMore");
    } finally {
      setLoadingMore(false);
      setTimeout(() => {
        loadingMoreRef.current = false;
      }, 50);
    }
  }, [hasMore, lastDoc, params.uid]);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }
    refreshInFlightRef.current = true;
    setValidating(true);
    try {
      await syncSavedMeals();
      setErrorKind(null);
    } catch {
      setErrorKind("refresh");
    } finally {
      refreshInFlightRef.current = false;
      setValidating(false);
    }
  }, [syncSavedMeals]);

  const visibleItems = useMemo(
    () =>
      filterVisibleSavedMeals({
        items,
        query: debouncedQuery,
        filters: params.filters,
      }),
    [debouncedQuery, items, params.filters],
  );

  const dataState = resolveDataViewState({
    isLoading: loading,
    hasData: visibleItems.length > 0,
    isOnline: params.isOnline,
    hasError: !!errorKind,
  });

  useEffect(() => {
    hasMoreRef.current = hasMore;
    lastDocRef.current = lastDoc;
    visibleCountRef.current = visibleItems.length;
  }, [hasMore, lastDoc, visibleItems.length]);

  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (
        loadingMoreRef.current ||
        !hasMoreRef.current ||
        !lastDocRef.current
      ) {
        return;
      }
      const globalMax = viewableItems.reduce((max, item) => {
        const idx = typeof item.index === "number" ? item.index : -1;
        return idx > max ? idx : max;
      }, -1);
      const remaining = visibleCountRef.current - (globalMax + 1);
      if (remaining <= 10) {
        void loadMoreRef.current();
      }
    },
  );

  const onDelete = useCallback(
    async (meal: Meal) => {
      if (!params.uid || !meal.cloudId) return;
      setItems((prev) =>
        prev.filter((item) => (item.cloudId || item.mealId) !== meal.cloudId),
      );
      await deleteSavedMeal({
        uid: params.uid,
        cloudId: meal.cloudId,
        isOnline: params.isOnline,
      });
    },
    [params.isOnline, params.uid],
  );

  return {
    pageSize: PAGE_SIZE,
    loading,
    loadingMore,
    validating,
    errorKind,
    dataState,
    visibleItems,
    refresh,
    onDelete,
    onViewableItemsChanged,
    viewabilityConfig,
  };
}

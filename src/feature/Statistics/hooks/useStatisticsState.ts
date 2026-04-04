import { useEffect, useMemo, useState } from "react";
import type { Meal } from "@/types/meal";
import { useMeals } from "@/hooks/useMeals";
import { useStats } from "@/hooks/useStats";
import { lastNDaysRange } from "../utils/dateRange";
import type {
  DateRange,
  MetricKey,
  RangeKey,
  StatisticsEmptyKind,
} from "@/feature/Statistics/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const endOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
};

const normalizeRange = (range: DateRange): DateRange => {
  const start = startOfDay(range.start);
  const end = startOfDay(range.end);
  if (start <= end) return { start, end };
  return { start: end, end: start };
};

const getMealTimestamp = (meal: Meal): Date | null => {
  const value = meal.timestamp ?? meal.updatedAt ?? meal.createdAt;
  const date = new Date(value ?? "");
  return Number.isNaN(date.getTime()) ? null : date;
};

const isDateInRange = (date: Date, range: DateRange): boolean => {
  const ts = date.getTime();
  return ts >= range.start.getTime() && ts <= range.end.getTime();
};

const buildRecentRange = (days: number): DateRange => {
  const range = lastNDaysRange(days);
  return normalizeRange(range);
};

const formatLabel = (date: Date, totalDays: number): string =>
  date.toLocaleDateString(undefined, {
    weekday: totalDays <= 7 ? "short" : undefined,
    month: totalDays > 7 ? "short" : undefined,
    day: totalDays > 7 ? "numeric" : undefined,
  });

const normalizeSeries = (
  source: number[] | undefined,
  length: number,
): number[] => {
  if (!Array.isArray(source)) {
    return Array.from({ length }, () => 0);
  }

  if (source.length === length) {
    return source.map((value) => Number(value) || 0);
  }

  if (source.length > length) {
    return source.slice(source.length - length).map((value) => Number(value) || 0);
  }

  return [
    ...Array.from({ length: length - source.length }, () => 0),
    ...source.map((value) => Number(value) || 0),
  ];
};

type NutrientsBucket = {
  protein: number;
  carbs: number;
  fat: number;
};

export function useStatisticsState(params: {
  uid: string;
  calorieTarget: number | null;
  accessWindowDays?: number;
}) {
  const { meals, getMeals, loading: loadingMeals } = useMeals(params.uid);

  const [active, setActive] = useState<RangeKey>("7d");
  const [customRange, setCustomRangeState] = useState<DateRange>(() =>
    buildRecentRange(7),
  );
  const [metric, setMetric] = useState<MetricKey>("kcal");

  const setCustomRange = (range: DateRange) => {
    setCustomRangeState(normalizeRange(range));
  };

  useEffect(() => {
    if (!params.uid || typeof getMeals !== "function") return;
    void getMeals();
  }, [getMeals, params.uid]);

  const selectedRange = useMemo<DateRange>(() => {
    if (active === "7d") return buildRecentRange(7);
    if (active === "30d") return buildRecentRange(30);
    return normalizeRange(customRange);
  }, [active, customRange]);

  const effectiveRange = useMemo<DateRange>(() => {
    const today = startOfDay(new Date());
    let nextStart = selectedRange.start;
    let nextEnd = selectedRange.end > today ? today : selectedRange.end;

    if (params.accessWindowDays && params.accessWindowDays > 0) {
      const cutoff = startOfDay(new Date());
      cutoff.setDate(cutoff.getDate() - params.accessWindowDays + 1);
      if (nextStart < cutoff) nextStart = cutoff;
      if (nextEnd < cutoff) nextEnd = cutoff;
    }

    if (nextStart > nextEnd) {
      nextStart = nextEnd;
    }

    return { start: nextStart, end: nextEnd };
  }, [params.accessWindowDays, selectedRange.end, selectedRange.start]);

  const statsRange = useMemo(
    () => ({
      start: startOfDay(effectiveRange.start),
      end: endOfDay(effectiveRange.end),
    }),
    [effectiveRange.end, effectiveRange.start],
  );

  const stats = useStats(meals, statsRange, params.calorieTarget);

  const days = useMemo(
    () =>
      Math.max(
        1,
        Math.floor(
          (effectiveRange.end.getTime() - effectiveRange.start.getTime()) / DAY_MS,
        ) + 1,
      ),
    [effectiveRange.end, effectiveRange.start],
  );

  const mealsInEffectiveRange = useMemo(() => {
    return meals.filter((meal) => {
      const mealTimestamp = getMealTimestamp(meal);
      if (!mealTimestamp) return false;
      return isDateInRange(mealTimestamp, statsRange);
    }).length;
  }, [meals, statsRange]);

  const hasAnyMeals = meals.length > 0;
  const hasEntriesInRange = mealsInEffectiveRange > 0;

  const emptyKind: StatisticsEmptyKind =
    !loadingMeals && !hasAnyMeals
      ? "no_history"
      : !loadingMeals && hasAnyMeals && !hasEntriesInRange
        ? "no_entries_in_range"
        : "none";

  const { labels, nutrientsByDay } = useMemo(() => {
    const buckets = Array.from({ length: days }, () => ({
      protein: 0,
      carbs: 0,
      fat: 0,
    }));

    const nextLabels = Array.from({ length: days }, (_, index) => {
      const dayDate = new Date(effectiveRange.start.getTime() + index * DAY_MS);
      return formatLabel(dayDate, days);
    });

    for (const meal of meals) {
      const mealTimestamp = getMealTimestamp(meal);
      if (!mealTimestamp || !isDateInRange(mealTimestamp, statsRange)) continue;

      const mealDay = startOfDay(mealTimestamp);
      const index = Math.floor(
        (mealDay.getTime() - effectiveRange.start.getTime()) / DAY_MS,
      );

      if (index < 0 || index >= days) continue;

      const mealIngredients = meal.ingredients ?? [];
      if (mealIngredients.length > 0) {
        for (const ingredient of mealIngredients) {
          buckets[index].protein += Number(ingredient?.protein) || 0;
          buckets[index].carbs += Number(ingredient?.carbs) || 0;
          buckets[index].fat += Number(ingredient?.fat) || 0;
        }
      } else if (meal.totals) {
        buckets[index].protein += Number(meal.totals.protein) || 0;
        buckets[index].carbs += Number(meal.totals.carbs) || 0;
        buckets[index].fat += Number(meal.totals.fat) || 0;
      }
    }

    return {
      labels: nextLabels,
      nutrientsByDay: buckets as NutrientsBucket[],
    };
  }, [days, effectiveRange.start, meals, statsRange]);

  const kcalSeries = normalizeSeries(stats.caloriesSeries, days);
  const proteinSeries = nutrientsByDay.map((day) => day.protein || 0);
  const carbsSeries = nutrientsByDay.map((day) => day.carbs || 0);
  const fatSeries = nutrientsByDay.map((day) => day.fat || 0);

  const seriesByMetric: Record<MetricKey, number[]> = {
    kcal: kcalSeries,
    protein: proteinSeries,
    carbs: carbsSeries,
    fat: fatSeries,
  };

  const totals = {
    kcal:
      typeof stats.totals?.kcal === "number"
        ? stats.totals.kcal
        : kcalSeries.reduce((sum, value) => sum + (value || 0), 0),
    protein:
      typeof stats.totals?.protein === "number"
        ? stats.totals.protein
        : proteinSeries.reduce((sum, value) => sum + (value || 0), 0),
    carbs:
      typeof stats.totals?.carbs === "number"
        ? stats.totals.carbs
        : carbsSeries.reduce((sum, value) => sum + (value || 0), 0),
    fat:
      typeof stats.totals?.fat === "number"
        ? stats.totals.fat
        : fatSeries.reduce((sum, value) => sum + (value || 0), 0),
  };

  const averages = {
    kcal:
      typeof stats.averages?.kcal === "number"
        ? stats.averages.kcal
        : Math.round(totals.kcal / Math.max(1, days)),
    protein:
      typeof stats.averages?.protein === "number"
        ? stats.averages.protein
        : Math.round(totals.protein / Math.max(1, days)),
    carbs:
      typeof stats.averages?.carbs === "number"
        ? stats.averages.carbs
        : Math.round(totals.carbs / Math.max(1, days)),
    fat:
      typeof stats.averages?.fat === "number"
        ? stats.averages.fat
        : Math.round(totals.fat / Math.max(1, days)),
  };

  const metricAverageByKey: Record<MetricKey, number> = {
    kcal: averages.kcal,
    protein: averages.protein,
    carbs: averages.carbs,
    fat: averages.fat,
  };

  const hasTotals =
    totals.kcal > 0 || totals.protein > 0 || totals.carbs > 0 || totals.fat > 0;

  return {
    active,
    setActive,
    customRange,
    setCustomRange,
    metric,
    setMetric,
    loadingMeals,
    selectedRange,
    effectiveRange,
    days,
    emptyKind,
    hasAnyMeals,
    hasEntriesInRange,
    labels,
    seriesByMetric,
    selectedSeries: seriesByMetric[metric],
    totals,
    hasTotals,
    avgKcal: averages.kcal,
    avgProtein: averages.protein,
    avgCarbs: averages.carbs,
    avgFat: averages.fat,
    metricAverage: metricAverageByKey[metric],
    isWindowLimited:
      !!params.accessWindowDays &&
      selectedRange.start.getTime() < effectiveRange.start.getTime(),
  };
}

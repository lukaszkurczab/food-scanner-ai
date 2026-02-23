import { useEffect, useMemo, useState } from "react";
import { useMeals } from "@/hooks/useMeals";
import { useStats } from "@/hooks/useStats";
import { lastNDaysRange } from "../utils/dateRange";
import type { MetricKey } from "../components/MetricsGrid";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RangeKey = "7d" | "30d" | "custom";

type DateRange = {
  start: Date;
  end: Date;
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
  const [customRange, setCustomRange] = useState<DateRange>({
    start: new Date(),
    end: new Date(),
  });
  const [metric, setMetric] = useState<MetricKey>("kcal");

  useEffect(() => {
    if (!params.uid) return;
    if (typeof getMeals === "function") {
      void getMeals();
    }
  }, [getMeals, params.uid]);

  const baseRange = useMemo(() => {
    if (active === "7d") return lastNDaysRange(7);
    if (active === "30d") return lastNDaysRange(30);
    return customRange;
  }, [active, customRange]);

  const effectiveRange = useMemo(() => {
    if (!params.accessWindowDays) return baseRange;
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - params.accessWindowDays + 1);
    cutoff.setHours(0, 0, 0, 0);

    const start = baseRange.start < cutoff ? cutoff : baseRange.start;
    const end = baseRange.end < cutoff ? cutoff : baseRange.end;

    return { start, end } as const;
  }, [baseRange, params.accessWindowDays]);

  const statsRange = useMemo(() => {
    const start = new Date(effectiveRange.start);
    const end = new Date(effectiveRange.end);
    end.setHours(23, 59, 59, 999);
    return { start, end } as const;
  }, [effectiveRange]);

  const stats = useStats(meals, statsRange, params.calorieTarget);

  const days = useMemo(
    () =>
      Math.max(
        1,
        Math.round(
          (+effectiveRange.end - +effectiveRange.start) / DAY_MS,
        ) + 1,
      ),
    [effectiveRange.end, effectiveRange.start],
  );

  const showLineSection = active !== "custom" || days >= 2;

  const { labels, nutrientsByDay } = useMemo(() => {
    const start = new Date(effectiveRange.start);
    start.setHours(0, 0, 0, 0);

    const end = new Date(effectiveRange.end);
    end.setHours(0, 0, 0, 0);

    const bucketCount = Math.max(1, Math.round((+end - +start) / DAY_MS) + 1);

    const buckets = Array.from({ length: bucketCount }, () => ({
      protein: 0,
      carbs: 0,
      fat: 0,
    }));

    const formatLabel = (date: Date) => {
      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      return `${dd}.${mm}`;
    };

    const nextLabels: string[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const date = new Date(+start + i * DAY_MS);
      nextLabels.push(formatLabel(date));
    }

    const endInclusive = new Date(+end + DAY_MS - 1);

    for (const meal of meals) {
      const ts = new Date(meal.timestamp || meal.updatedAt || meal.createdAt);
      if (ts < start || ts > endInclusive) continue;

      ts.setHours(0, 0, 0, 0);
      const idx = Math.floor((+ts - +start) / DAY_MS);
      if (idx < 0 || idx >= bucketCount) continue;

      const ingredients = meal.ingredients || [];
      if (ingredients.length) {
        for (const ingredient of ingredients) {
          buckets[idx].protein += Number(ingredient?.protein) || 0;
          buckets[idx].carbs += Number(ingredient?.carbs) || 0;
          buckets[idx].fat += Number(ingredient?.fat) || 0;
        }
      } else if (meal.totals) {
        buckets[idx].protein += Number(meal.totals.protein) || 0;
        buckets[idx].carbs += Number(meal.totals.carbs) || 0;
        buckets[idx].fat += Number(meal.totals.fat) || 0;
      }
    }

    return {
      labels: nextLabels,
      nutrientsByDay: buckets as NutrientsBucket[],
    } as const;
  }, [effectiveRange, meals]);

  const kcalSeries = stats.caloriesSeries ?? [];
  const proteinSeries = nutrientsByDay.map((nutrient) => nutrient.protein ?? 0);
  const carbsSeries = nutrientsByDay.map((nutrient) => nutrient.carbs ?? 0);
  const fatSeries = nutrientsByDay.map((nutrient) => nutrient.fat ?? 0);

  const seriesByMetric: Record<MetricKey, number[]> = {
    kcal: kcalSeries,
    protein: proteinSeries,
    carbs: carbsSeries,
    fat: fatSeries,
  };

  const totals = stats.totals ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const averages = stats.averages ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  const totalKcal =
    typeof stats.totals?.kcal === "number"
      ? stats.totals.kcal
      : kcalSeries.reduce((sum, value) => sum + (value || 0), 0);

  const avgKcal =
    typeof averages.kcal === "number"
      ? averages.kcal
      : Math.round(totalKcal / Math.max(1, days));

  const avgProtein =
    typeof averages.protein === "number"
      ? averages.protein
      : Math.round((totals.protein ?? 0) / Math.max(1, days));

  const avgCarbs =
    typeof averages.carbs === "number"
      ? averages.carbs
      : Math.round((totals.carbs ?? 0) / Math.max(1, days));

  const avgFat =
    typeof averages.fat === "number"
      ? averages.fat
      : Math.round((totals.fat ?? 0) / Math.max(1, days));

  const hasAnySeriesData =
    kcalSeries.some((value) => value > 0) ||
    proteinSeries.some((value) => value > 0) ||
    carbsSeries.some((value) => value > 0) ||
    fatSeries.some((value) => value > 0);

  const hasTotals =
    (totals.kcal ?? 0) > 0 ||
    (totals.protein ?? 0) > 0 ||
    (totals.carbs ?? 0) > 0 ||
    (totals.fat ?? 0) > 0;

  const empty =
    !loadingMeals && meals.length === 0 && !hasAnySeriesData && !hasTotals;

  return {
    active,
    setActive,
    customRange,
    setCustomRange,
    metric,
    setMetric,
    loadingMeals,
    empty,
    showLineSection,
    labels,
    selectedSeries: seriesByMetric[metric],
    hasTotals,
    totals,
    avgKcal,
    avgProtein,
    avgCarbs,
    avgFat,
    kcalSeries,
    days,
    totalKcal,
    isWindowLimited:
      !!params.accessWindowDays && baseRange.start < effectiveRange.start,
  };
}

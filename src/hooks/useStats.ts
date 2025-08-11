import { useMemo } from "react";
import type { Meal } from "@/types";
import {
  getStatsForRange,
  StatsRange,
  StatsResult,
} from "@/feature/Statistics/utils/getStatsForRange";

export function useStats(
  meals: Meal[],
  range: StatsRange,
  userGoal?: number | null
) {
  return useMemo<StatsResult>(() => {
    return getStatsForRange(meals, range, userGoal);
  }, [meals, range.start.getTime(), range.end.getTime(), userGoal]);
}

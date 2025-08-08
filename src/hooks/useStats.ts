import { useMemo } from "react";
import type { Meal } from "@/src/types";
import {
  getStatsForRange,
  StatsRange,
  StatsResult,
} from "@/src/feature/Statistics/utils/getStatsForRange";

export function useStats(
  meals: Meal[],
  range: StatsRange,
  userGoal?: number | null
) {
  return useMemo<StatsResult>(() => {
    return getStatsForRange(meals, range, userGoal);
  }, [meals, range.start.getTime(), range.end.getTime(), userGoal]);
}

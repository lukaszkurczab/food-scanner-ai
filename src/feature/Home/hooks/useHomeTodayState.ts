import { useMemo } from "react";
import { useMeals } from "@/hooks/useMeals";
import type { UserData } from "@/types";
import { formatMealDayKey, normalizeMealDayKey } from "@/services/meals/mealMetadata";
import { buildHomeDayState } from "@/feature/Home/services/homeDaySelectors";

export function useHomeTodayState(params: {
  uid: string | null | undefined;
  selectedDayKey: string | null | undefined;
  userData: Pick<UserData, "calorieTarget" | "preferences" | "goal"> | null | undefined;
  today?: Date;
}) {
  const { meals, loading } = useMeals(params.uid ?? null);
  const selectedDayKey = normalizeMealDayKey(params.selectedDayKey);
  const todayDayKey = formatMealDayKey(params.today ?? new Date());

  const dayState = useMemo(
    () =>
      buildHomeDayState({
        meals,
        selectedDayKey,
        todayDayKey,
        userData: params.userData,
      }),
    [meals, params.userData, selectedDayKey, todayDayKey],
  );

  return useMemo(
    () => ({
      ...dayState,
      meals,
      loading,
    }),
    [dayState, loading, meals],
  );
}

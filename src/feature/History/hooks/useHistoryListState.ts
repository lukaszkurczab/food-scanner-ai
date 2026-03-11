import { useCallback, useMemo } from "react";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext";
import { usePremiumContext } from "@/context/PremiumContext";
import { useFilters } from "@/context/HistoryContext";
import { FREE_WINDOW_DAYS } from "@/services/meals/mealService";
import type { Meal } from "@/types/meal";
import { useHistorySectionsData } from "@/feature/History/hooks/useHistorySectionsData";
import type { RootStackParamList } from "@/navigation/navigate";

export function useHistoryListState(params: {
  navigation: StackNavigationProp<RootStackParamList, "HistoryList">;
}) {
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;
  const { uid } = useAuthContext();
  const { t } = useTranslation(["meals", "common"]);

  const {
    query,
    setQuery,
    filters,
    showFilters,
    toggleShowFilters,
    filterCount,
  } = useFilters("history");

  const { isPremium } = usePremiumContext();
  const premiumActive = isPremium === true;
  const accessWindowDays = premiumActive ? undefined : FREE_WINDOW_DAYS;

  const {
    loading,
    loadingMore,
    errorKind,
    sections,
    dataState,
    onEndReached,
    refresh,
  } = useHistorySectionsData({
    uid,
    query,
    filters,
    accessWindowDays,
    todayLabel: t("common:today"),
    isOnline,
  });

  const keyExtractor = useCallback(
    (item: Meal) => item.cloudId || item.mealId,
    [],
  );

  const onMealPress = useCallback(
    (meal: Meal) => {
      params.navigation.navigate("MealDetails", { meal });
    },
    [params.navigation],
  );

  const onUpgrade = useCallback(() => {
    params.navigation.navigate("ManageSubscription");
  }, [params.navigation]);

  const emptyState = useMemo(() => {
    if (dataState === "ready" || dataState === "loading") return null;

    const errorMessage =
      errorKind === "load"
        ? t("history.loadError", { ns: "meals" })
        : errorKind === "sync"
          ? t("history.syncError", { ns: "meals" })
          : t("common:unknownError");

    const description =
      dataState === "error"
        ? errorMessage
        : dataState === "offline-empty"
          ? t("history.offlineEmpty", { ns: "meals" })
          : query
            ? t("meals:tryDifferentSearch")
            : t("meals:tryChangeFilters");

    const title =
      dataState === "error"
        ? t("history.errorTitle", { ns: "meals" })
        : t("meals:noMealsFound");

    return { title, description };
  }, [dataState, errorKind, query, t]);

  return {
    isOnline,
    isPremium: premiumActive,
    query,
    setQuery,
    showFilters,
    toggleShowFilters,
    filterCount,
    loading,
    loadingMore,
    sections,
    dataState,
    refresh,
    onEndReached,
    keyExtractor,
    onMealPress,
    onUpgrade,
    emptyState,
    kcalLabel: t("common:kcal"),
  };
}

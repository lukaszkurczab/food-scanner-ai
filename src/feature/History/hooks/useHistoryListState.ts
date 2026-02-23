import { useCallback, useMemo } from "react";
import type { ParamListBase } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext";
import { useFilters } from "@/context/HistoryContext";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { FREE_WINDOW_DAYS } from "@/services/mealService";
import type { Meal } from "@/types/meal";
import { useHistorySectionsData } from "@/feature/History/hooks/useHistorySectionsData";

export function useHistoryListState(params: {
  navigation: StackNavigationProp<ParamListBase>;
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

  const sub = useSubscriptionData(uid);
  const isPremium = sub?.state === "premium_active";
  const accessWindowDays = isPremium ? undefined : FREE_WINDOW_DAYS;
  const syncStatus = useSyncStatus(uid);

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
    params.navigation.navigate("Paywall");
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
    isPremium,
    syncStatus,
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

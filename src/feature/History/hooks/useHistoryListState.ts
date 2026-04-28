import { useCallback, useEffect, useMemo, useState } from "react";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext";
import { usePremiumContext } from "@/context/PremiumContext";
import { useFilters } from "@/context/HistoryContext";
import { FREE_WINDOW_DAYS } from "@/services/meals/mealService";
import {
  getDeadLetterCount,
  retryDeadLetterOps,
  type QueueKind,
} from "@/services/offline/queue.repo";
import { pushQueue } from "@/services/offline/sync.engine";
import { emit, on } from "@/services/core/events";
import type { Meal } from "@/types/meal";
import { useHistorySectionsData } from "@/feature/History/hooks/useHistorySectionsData";
import type { RootStackParamList } from "@/navigation/navigate";

const DEAD_LETTER_HISTORY_KINDS: QueueKind[] = [
  "upsert",
  "delete",
  "upsert_mymeal",
  "delete_mymeal",
];

export function useHistoryListState(params: {
  navigation: StackNavigationProp<RootStackParamList, "HistoryList">;
}) {
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;
  const { uid } = useAuthContext();
  const { t, i18n } = useTranslation(["history", "meals", "common"]);
  const [failedSyncCount, setFailedSyncCount] = useState(0);
  const [retryingFailedSync, setRetryingFailedSync] = useState(false);

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
    yesterdayLabel: t("common:yesterday"),
    locale: i18n.language,
    isOnline,
  });

  const refreshFailedSyncCount = useCallback(async () => {
    if (!uid) {
      setFailedSyncCount(0);
      return;
    }
    try {
      const count = await getDeadLetterCount(uid, {
        kinds: DEAD_LETTER_HISTORY_KINDS,
      });
      setFailedSyncCount(count);
    } catch {
      // Ignore dead-letter count errors - history data can still render.
    }
  }, [uid]);

  useEffect(() => {
    void refreshFailedSyncCount();
  }, [refreshFailedSyncCount]);

  useEffect(() => {
    if (!uid) return;
    const refreshForUid = (event?: { uid?: string }) => {
      const eventUid = typeof event?.uid === "string" ? event.uid : uid;
      if (eventUid !== uid) return;
      void refreshFailedSyncCount();
    };
    const unsubs = [
      on<{ uid?: string }>("sync:op:dead", refreshForUid),
      on<{ uid?: string }>("sync:op:retried", refreshForUid),
    ];
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [uid, refreshFailedSyncCount]);

  const retryFailedSyncOps = useCallback(async () => {
    if (!uid || retryingFailedSync) return;
    setRetryingFailedSync(true);
    try {
      const retried = await retryDeadLetterOps({
        uid,
        kinds: DEAD_LETTER_HISTORY_KINDS,
      });
      await refreshFailedSyncCount();

      if (retried > 0) {
        emit("ui:toast", {
          key: "history.deadLetterRetryQueued",
          ns: "meals",
          options: { count: retried },
        });
      }

      if (retried > 0 && isOnline) {
        await pushQueue(uid);
        await refreshFailedSyncCount();
      }
    } catch {
      emit("ui:toast", {
        text: t("common:unknownError"),
      });
    } finally {
      setRetryingFailedSync(false);
    }
  }, [isOnline, refreshFailedSyncCount, retryingFailedSync, t, uid]);

  const keyExtractor = useCallback(
    (item: Meal) => item.cloudId || item.mealId,
    [],
  );

  const onMealPress = useCallback(
    (meal: Meal) => {
      if (!meal.cloudId) return;
      params.navigation.navigate("MealDetails", {
        cloudId: meal.cloudId,
        initialMeal: meal,
      });
    },
    [params.navigation],
  );

  const onUpgrade = useCallback(() => {
    params.navigation.navigate("ManageSubscription");
  }, [params.navigation]);

  const onLogFirstMeal = useCallback(() => {
    params.navigation.navigate("MealAddMethod", {
      selectionMode: "temporary",
      origin: "mealAddFlow",
    });
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
            : t("history.emptyDescription", {
                ns: "history",
              });

    const title =
      dataState === "error"
        ? t("history.errorTitle", { ns: "meals" })
        : query
          ? t("meals:noMealsFound")
          : t("history.emptyTitle", {
              ns: "history",
            });

    return { title, description };
  }, [dataState, errorKind, query, t]);

  const deadLetterBanner = useMemo(() => {
    if (failedSyncCount <= 0) return null;
    return {
      title: t("history.deadLetterTitle", {
        ns: "meals",
        count: failedSyncCount,
      }),
      description: t("history.deadLetterSubtitle", { ns: "meals" }),
      actionLabel: t("common:retry"),
      count: failedSyncCount,
    };
  }, [failedSyncCount, t]);

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
    onLogFirstMeal,
    deadLetterBanner,
    retryingFailedSync,
    retryFailedSyncOps,
    kcalLabel: t("common:kcal"),
  };
}

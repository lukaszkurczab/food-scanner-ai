import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  SectionList,
  RefreshControl,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import { useNetInfo } from "@react-native-community/netinfo";
import { Layout, BottomTabBar, SearchBox } from "@/components";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { FilterPanel } from "../components/FilterPanel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { MealListItem } from "../../../components/MealListItem";
import type { Meal } from "@/types/meal";
import { useTranslation } from "react-i18next";
import { useFilters } from "@/context/HistoryContext";
import { useSubscriptionData } from "@hooks/useSubscriptionData";
import { FREE_WINDOW_DAYS } from "@services/mealService";
import {
  getMealsPageLocalFiltered,
  type LocalHistoryFilters,
  getMealByCloudIdLocal,
} from "@/services/offline/meals.repo";
import { pullChanges } from "@/services/offline/sync.engine";
import { on } from "@/services/events";

const PAGE = 20;

type DaySection = {
  title: string;
  dateKey: string;
  totalKcal: number;
  data: Meal[];
};

const toDate = (val?: string | number | null): Date => {
  if (!val) return new Date(0);
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

const fmtDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const fmtHeader = (d: Date, t: (k: string) => string) => {
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) return t("common:today");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
};

const mealKcal = (meal: Meal) =>
  (meal.ingredients || []).reduce(
    (sum, ing: any) => sum + (Number(ing?.kcal) || 0),
    0,
  ) ||
  (meal as any)?.totals?.kcal ||
  0;

const norm = (s: any) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function groupAddOrUpdate(
  sections: Map<string, DaySection>,
  t: (k: string) => string,
  meal: Meal,
) {
  const d = toDate(meal.timestamp || meal.updatedAt || meal.createdAt);
  const key = fmtDateKey(d);
  const title = fmtHeader(d, t);
  const section = sections.get(key) ?? {
    title,
    dateKey: key,
    totalKcal: 0,
    data: [],
  };
  const id = String(meal.cloudId || meal.mealId);
  const without = section.data.filter(
    (m) => String(m.cloudId || m.mealId) !== id,
  );
  const nextData = [...without, meal].sort((a, b) =>
    String(b.timestamp || b.updatedAt || "").localeCompare(
      String(a.timestamp || a.updatedAt || ""),
    ),
  );
  const total = nextData.reduce((acc, m) => acc + mealKcal(m), 0);
  sections.set(key, {
    title,
    dateKey: key,
    totalKcal: Math.round(total),
    data: nextData,
  });
}

function groupRemove(sections: Map<string, DaySection>, id: string) {
  for (const [key, sec] of sections.entries()) {
    const filtered = sec.data.filter(
      (m) => String(m.cloudId || m.mealId) !== id,
    );
    if (filtered.length !== sec.data.length) {
      const total = filtered.reduce((acc, m) => acc + mealKcal(m), 0);
      if (filtered.length === 0) {
        sections.delete(key);
      } else {
        sections.set(key, {
          ...sec,
          data: filtered,
          totalKcal: Math.round(total),
        });
      }
      break;
    }
  }
}

function sectionsToArray(sections: Map<string, DaySection>): DaySection[] {
  return Array.from(sections.values()).sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey),
  );
}

type SectionHeaderProps = {
  title: string;
  total: number;
  theme: any;
  kcalLabel: string;
};

const SectionHeader = React.memo(
  ({ title, total, theme, kcalLabel }: SectionHeaderProps) => (
    <View
      style={[
        styles.sectionHeader,
        {
          paddingBottom: theme.spacing.sm,
        },
      ]}
    >
      <Text
        style={{
          color: theme.text,
          fontSize: theme.typography.size.lg,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: theme.textSecondary,
          fontSize: theme.typography.size.md,
          fontWeight: "400",
        }}
      >
        {total} {kcalLabel}
      </Text>
    </View>
  ),
);

const MemoMealListItem = React.memo(MealListItem);

type HistoryRowProps = {
  meal: Meal;
  navigation: any;
  theme: any;
};

const HistoryRow = React.memo(
  ({ meal, navigation, theme }: HistoryRowProps) => (
    <View
      style={{
        marginBottom: theme.spacing.sm,
      }}
    >
      <MemoMealListItem
        meal={meal}
        onPress={() => navigation.navigate("MealDetails", { meal })}
        onEdit={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
      />
    </View>
  ),
  (prev, next) => prev.meal === next.meal,
);

export default function HistoryListScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const netInfo = useNetInfo();
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

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sectionsMap, setSectionsMap] = useState<Map<string, DaySection>>(
    () => new Map(),
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);
  const firstFocus = useRef(true);

  const localFilters: LocalHistoryFilters | undefined = useMemo(() => {
    if (!filters) return undefined;
    return {
      calories: filters.calories,
      protein: filters.protein,
      carbs: filters.carbs,
      fat: filters.fat,
      dateRange: filters.dateRange
        ? {
            start: new Date(filters.dateRange.start),
            end: new Date(filters.dateRange.end),
          }
        : undefined,
    };
  }, [filters]);

  const resetAndLoadLocal = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!uid) {
        setSectionsMap(new Map());
        setCursor(null);
        setHasMore(false);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const page = await getMealsPageLocalFiltered(uid, {
          limit: PAGE,
          beforeISO: null,
          filters: localFilters,
        });
        const map = new Map<string, DaySection>();
        for (const meal of page.items) groupAddOrUpdate(map, t, meal);
        setSectionsMap(map);
        setCursor(page.nextBefore);
        setHasMore(!!page.nextBefore && page.items.length === PAGE);
      } finally {
        setLoading(false);
      }
    },
    [uid, localFilters, t],
  );

  useEffect(() => {
    void resetAndLoadLocal();
    if (uid) void pullChanges(uid);
  }, [uid, resetAndLoadLocal]);

  const prevKey = useRef<string>("");
  useEffect(() => {
    const key = JSON.stringify({ uid, localFilters, accessWindowDays });
    if (!uid || key === prevKey.current) return;
    prevKey.current = key;
    void resetAndLoadLocal();
    if (uid) void pullChanges(uid);
  }, [uid, localFilters, accessWindowDays, resetAndLoadLocal]);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (uid) void pullChanges(uid);
    }, [uid]),
  );

  useEffect(() => {
    if (!uid) return;

    const up = on("meal:local:upserted", async (e: any) => {
      const id = String(e?.cloudId || "");
      if (!id) return;
      const m = await getMealByCloudIdLocal(uid, id);
      if (!m || m.deleted) return;
      setSectionsMap((prev) => {
        const next = new Map(prev);
        groupAddOrUpdate(next, t, m);
        return next;
      });
    });

    const del = on("meal:local:deleted", async (e: any) => {
      const id = String(e?.cloudId || "");
      if (!id) return;
      setSectionsMap((prev) => {
        const next = new Map(prev);
        groupRemove(next, id);
        return next;
      });
    });

    const pushed = on("meal:pushed", () => {});
    const synced = on("meal:synced", () => {});

    return () => {
      [up, del, pushed, synced].forEach((u) => u && u());
    };
  }, [uid, t]);

  const loadMore = useCallback(async () => {
    if (!uid || !hasMore || loadingMoreRef.current || !cursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await getMealsPageLocalFiltered(uid, {
        limit: PAGE,
        beforeISO: cursor,
        filters: localFilters,
      });
      setSectionsMap((prev) => {
        const next = new Map(prev);
        for (const meal of page.items) groupAddOrUpdate(next, t, meal);
        return next;
      });
      setCursor(page.nextBefore);
      setHasMore(!!page.nextBefore && page.items.length === PAGE);
    } finally {
      setLoadingMore(false);
      setTimeout(() => {
        loadingMoreRef.current = false;
      }, 50);
    }
  }, [uid, hasMore, cursor, localFilters, t]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMoreRef.current) return;
    loadMore();
  }, [hasMore, loadMore]);

  const refresh = useCallback(async () => {
    if (uid) await pullChanges(uid);
  }, [uid]);

  const sections: DaySection[] = useMemo(() => {
    const all = sectionsToArray(sectionsMap);
    if (!query) return all;
    const q = norm(query);
    const filtered: DaySection[] = [];
    for (const sec of all) {
      const data = sec.data.filter((m) => {
        const title = norm((m as any).title || (m as any).name || "");
        const ing = norm(
          (m.ingredients || [])
            .map((x: any) => x?.name || x?.title || "")
            .join(" "),
        );
        return title.includes(q) || ing.includes(q);
      });
      if (data.length) {
        const total = data.reduce((acc, m) => acc + mealKcal(m), 0);
        filtered.push({ ...sec, data, totalKcal: Math.round(total) });
      }
    }
    return filtered;
  }, [sectionsMap, query]);

  const kcalLabel = t("common:kcal");

  const keyExtractor = useCallback(
    (item: Meal) => (item as any).cloudId || (item as any).mealId,
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: DaySection }) => (
      <SectionHeader
        title={section.title}
        total={section.totalKcal}
        theme={theme}
        kcalLabel={kcalLabel}
      />
    ),
    [theme, kcalLabel],
  );

  const renderItem = useCallback(
    ({ item }: { item: Meal }) => (
      <HistoryRow meal={item} navigation={navigation} theme={theme} />
    ),
    [navigation, theme],
  );

  if (loading && sections.length === 0)
    return (
      <View style={[styles.centerBoth, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );

  if (sections.length === 0) {
    return (
      <Layout>
        {!netInfo.isConnected && <OfflineBanner />}
        {showFilters ? (
          <FilterPanel
            scope="history"
            isPremium={isPremium}
            windowDays={FREE_WINDOW_DAYS}
            onUpgrade={() => navigation.navigate("Paywall")}
          />
        ) : (
          <>
            <SearchBox value={query} onChange={setQuery} />
            <EmptyState
              title={t("meals:noMealsFound")}
              description={
                query
                  ? t("meals:tryDifferentSearch")
                  : t("meals:tryChangeFilters")
              }
            />
          </>
        )}
      </Layout>
    );
  }

  return (
    <Layout disableScroll>
      {!netInfo.isConnected && <OfflineBanner />}
      {showFilters ? (
        <View style={{ height: "100%" }}>
          <FilterPanel
            scope="history"
            isPremium={isPremium}
            windowDays={FREE_WINDOW_DAYS}
            onUpgrade={() => navigation.navigate("Paywall")}
          />
        </View>
      ) : (
        <>
          <View
            style={[
              styles.topBar,
              {
                marginBottom: theme.spacing.md,
                gap: theme.spacing.sm,
              },
            ]}
          >
            <SearchBox value={query} onChange={setQuery} />
            <FilterBadgeButton
              activeCount={filterCount}
              onPress={toggleShowFilters}
            />
          </View>
          <SectionList
            sections={sections}
            style={styles.list}
            keyExtractor={keyExtractor}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refresh} />
            }
            renderSectionHeader={renderSectionHeader}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              loadingMore ? <LoadingSkeleton height={56} /> : null
            }
            stickySectionHeadersEnabled
            removeClippedSubviews
            windowSize={7}
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={60}
            scrollEventThrottle={16}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
          />
        </>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  centerBoth: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  topBar: {
    flexDirection: "row",
  },
  list: {
    marginBottom: 142,
  },
});

// screens/HistoryListScreen.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  SectionList,
  RefreshControl,
  Text,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import { useNetInfo } from "@react-native-community/netinfo";
import { Layout, BottomTabBar, SearchBox, UserIcon } from "@/components";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { FilterPanel } from "../components/FilterPanel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { MealListItem } from "../../../components/MealListItem";
import type { Meal } from "@/types/meal";
import { useTranslation } from "react-i18next";
import { useFilters } from "@/context/HistoryContext";
import {
  getMealsPageFiltered,
  type HistoryFilters,
} from "@services/mealService";

const PAGE = 10;

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
    d.getDate()
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
    0
  ) ||
  (meal as any)?.totals?.kcal ||
  0;
const norm = (s: any) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function HistoryListScreen({ navigation }: { navigation: any }) {
  console.log("[HistoryListScreen] mount");
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

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<Meal[]>([]);
  const [cursor, setCursor] = useState<any | null>(null); // DocumentSnapshot cursor
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);

  const serverFilters: HistoryFilters | undefined = useMemo(() => {
    if (!filters) return undefined;
    const f = {
      calories: filters.calories,
      protein: filters.protein,
      carbs: filters.carbs,
      fat: filters.fat,
      dateRange: filters.dateRange,
    };
    console.log("[HistoryListScreen] serverFilters", f);
    return f;
  }, [filters]);

  const resetAndLoad = useCallback(async () => {
    console.log("[HistoryListScreen.resetAndLoad] uid", uid);
    if (!uid) {
      setItems([]);
      setCursor(null);
      setHasMore(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await getMealsPageFiltered(uid, {
        limit: PAGE,
        cursor: null,
        filters: serverFilters,
      });
      console.log(
        "[HistoryListScreen.resetAndLoad] fetched",
        page.items.length,
        "cursorDoc?",
        !!page.nextCursor
      );
      setItems(page.items as any);
      setCursor(page.nextCursor);
      setHasMore(!!page.nextCursor && page.items.length === PAGE);
    } catch (e) {
      console.log("[HistoryListScreen.resetAndLoad] error", e);
      setItems([]);
      setCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [uid, serverFilters]);

  const loadMore = useCallback(async () => {
    if (!uid || !hasMore || loadingMoreRef.current || !cursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    console.log("[HistoryListScreen.loadMore] start cursorDoc?", !!cursor);
    try {
      const page = await getMealsPageFiltered(uid, {
        limit: PAGE,
        cursor,
        filters: serverFilters,
      });
      console.log(
        "[HistoryListScreen.loadMore] fetched",
        page.items.length,
        "nextDoc?",
        !!page.nextCursor
      );
      setItems((prev) => [...prev, ...(page.items as any)]);
      setCursor(page.nextCursor);
      setHasMore(!!page.nextCursor && page.items.length === PAGE);
    } catch (e) {
      console.log("[HistoryListScreen.loadMore] error", e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
      setTimeout(() => (loadingMoreRef.current = false), 50);
    }
  }, [uid, hasMore, cursor, serverFilters]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMoreRef.current) return;
    loadMore();
  }, [hasMore, loadMore]);

  const prevKey = useRef<string>("");
  useEffect(() => {
    const key = JSON.stringify({ uid, serverFilters });
    if (!uid || key === prevKey.current) return;
    prevKey.current = key;
    resetAndLoad();
  }, [uid, serverFilters, resetAndLoad]);

  useEffect(() => {
    console.log("[HistoryListScreen.effect] query", query);
  }, [query]);

  const byText = useMemo(() => {
    const q = norm(query);
    if (!q) return items;
    const filtered = items.filter((m) => {
      const title = norm(
        (m as any).title || (m as any).name || (m as any).mealName
      );
      const ing = norm(
        (m.ingredients || [])
          .map((x: any) => x?.name || x?.title || "")
          .join(" ")
      );
      return title.includes(q) || ing.includes(q);
    });
    console.log(
      "[HistoryListScreen.byText] items",
      items.length,
      "afterQuery",
      filtered.length
    );
    return filtered;
  }, [items, query]);

  const sections: DaySection[] = useMemo(() => {
    if (!byText.length) return [];
    const byKey = new Map<string, DaySection>();
    const keys: string[] = [];
    for (const meal of byText) {
      const d = toDate(
        (meal as any).timestamp ||
          (meal as any).updatedAt ||
          (meal as any).createdAt
      );
      const key = fmtDateKey(d);
      if (!byKey.has(key)) {
        byKey.set(key, {
          title: fmtHeader(d, t),
          dateKey: key,
          totalKcal: 0,
          data: [],
        });
        keys.push(key);
      }
      const s = byKey.get(key)!;
      s.data.push(meal);
      s.totalKcal += mealKcal(meal);
    }
    const out = keys.map((k) => {
      const s = byKey.get(k)!;
      return { ...s, totalKcal: Math.round(s.totalKcal) };
    });
    console.log("[HistoryListScreen.sections] sections", out.length);
    return out;
  }, [byText, t]);

  const refresh = useCallback(async () => {
    console.log("[HistoryListScreen.refresh]");
    await resetAndLoad();
  }, [resetAndLoad]);

  const onEditMeal = (_mealId: string) => {};
  const onDuplicateMeal = (_meal: Meal) => {};
  const onDeleteMeal = (_mealCloudId?: string) => {};

  if (loading)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );

  if (!sections.length) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {!netInfo.isConnected && <OfflineBanner />}
        {showFilters ? (
          <FilterPanel scope="history" />
        ) : (
          <>
            <View style={{ padding: theme.spacing.md }}>
              <SearchBox value={query} onChange={setQuery} />
            </View>
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
      </View>
    );
  }

  const SectionHeader = ({
    title,
    total,
  }: {
    title: string;
    total: number;
  }) => (
    <View
      style={{
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        backgroundColor: theme.background,
      }}
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
        {total} {t("common:kcal")}
      </Text>
    </View>
  );

  return (
    <Layout>
      {!netInfo.isConnected && <OfflineBanner />}
      {showFilters ? (
        <View style={{ height: "100%", paddingBottom: theme.spacing.nav }}>
          <FilterPanel scope="history" />
        </View>
      ) : (
        <View>
          <View
            style={{
              padding: theme.spacing.md,
              flexDirection: "row",
              gap: theme.spacing.sm,
            }}
          >
            <SearchBox value={query} onChange={setQuery} />
            <FilterBadgeButton
              activeCount={filterCount}
              onPress={toggleShowFilters}
            />
          </View>
          <SectionList
            sections={sections}
            style={{ marginBottom: 142 }}
            keyExtractor={(item) =>
              (item as any).cloudId || (item as any).mealId
            }
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refresh} />
            }
            renderSectionHeader={({ section }) => (
              <SectionHeader title={section.title} total={section.totalKcal} />
            )}
            renderItem={({ item }) => (
              <View
                style={{
                  paddingHorizontal: theme.spacing.md,
                  marginBottom: theme.spacing.sm,
                }}
              >
                <MealListItem
                  meal={item}
                  onPress={() =>
                    navigation.navigate("MealDetails", { meal: item })
                  }
                  onEdit={() =>
                    onEditMeal((item as any).cloudId || (item as any).mealId)
                  }
                  onDuplicate={() => onDuplicateMeal(item)}
                  onDelete={() => onDeleteMeal((item as any).cloudId)}
                />
              </View>
            )}
            contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              loadingMore ? <LoadingSkeleton height={56} /> : null
            }
            stickySectionHeadersEnabled
            removeClippedSubviews
            windowSize={7}
            initialNumToRender={PAGE}
          />
        </View>
      )}
      <BottomTabBar
        renderProfileIcon={
          <UserIcon size={32} accessibilityLabel="Profile picture" />
        }
      />
    </Layout>
  );
}

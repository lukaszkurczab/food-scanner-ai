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
  ViewToken,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals } from "@hooks/useMeals";
import type { Meal } from "@/types/meal";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { FilterPanel } from "../components/FilterPanel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useNetInfo } from "@react-native-community/netinfo";
import { Layout, BottomTabBar, SearchBox, UserIcon } from "@/components";
import { getMealsPage } from "@services/mealService";
import { MealListItem } from "../../../components/MealListItem";
import { useTranslation } from "react-i18next";
import { useHistoryContext } from "@/context/HistoryContext";

const PAGE_SIZE = 20;

type DaySection = {
  title: string;
  dateKey: string;
  totalKcal: number;
  data: Meal[];
};

type Filters = {
  calories?: [number, number];
  protein?: [number, number];
  carbs?: [number, number];
  fat?: [number, number];
  dateRange?: { start: Date; end: Date };
};

const mealTotals = (m: Meal) => {
  const ing = m.ingredients || [];
  const sum = <K extends "kcal" | "protein" | "carbs" | "fat">(k: K) =>
    ing.reduce((a, b) => a + (Number((b as any)?.[k]) || 0), 0);
  return {
    kcal: sum("kcal"),
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
  };
};

const toDate = (val?: string | number | null): Date | null => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const getMealDate = (m: Meal): Date => {
  return (
    toDate((m as any).timestamp) ||
    toDate((m as any).updatedAt) ||
    toDate((m as any).createdAt) ||
    new Date(0)
  );
};

const fmtDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const fmtHeader = (d: Date, t: (key: string) => string) => {
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
    (sum, ing) => sum + (Number((ing as any).kcal) || 0),
    0
  ) || 0;

const norm = (s: any) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function HistoryListScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const netInfo = useNetInfo();
  const { uid } = useAuthContext();
  const { duplicateMeal, deleteMeal, getMeals } = useMeals(uid || "");
  const { t } = useTranslation(["meals", "common"]);

  const {
    query,
    setQuery,
    filters,
    applyFilters,
    clearFilters,
    showFilters,
    toggleShowFilters,
    filterCount,
  } = useHistoryContext();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<Meal[]>([]);
  const [cursorBefore, setCursorBefore] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadingMoreRef = useRef(false);
  const lastCursorRef = useRef<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const page = await getMealsPage(uid, { limit: PAGE_SIZE, before: null });
    setItems(page.items);
    setCursorBefore(page.nextBefore);
    lastCursorRef.current = page.nextBefore;
    setHasMore(page.items.length === PAGE_SIZE && !!page.nextBefore);
    setLoading(false);
  }, [uid]);

  const loadMore = useCallback(async () => {
    if (!uid || !hasMore || loadingMoreRef.current || !cursorBefore) return;
    if (cursorBefore === lastCursorRef.current && items.length > 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const page = await getMealsPage(uid, {
      limit: PAGE_SIZE,
      before: cursorBefore,
    });
    const merged = new Map<string, Meal>();
    for (const it of items)
      merged.set(String((it as any).cloudId || (it as any).mealId), it);
    for (const it of page.items)
      merged.set(String((it as any).cloudId || (it as any).mealId), it);
    const next = Array.from(merged.values());
    setItems(next);
    setCursorBefore(page.nextBefore);
    setHasMore(
      page.items.length === PAGE_SIZE &&
        !!page.nextBefore &&
        page.nextBefore !== lastCursorRef.current
    );
    lastCursorRef.current = page.nextBefore;
    setLoadingMore(false);
    setTimeout(() => {
      loadingMoreRef.current = false;
    }, 50);
  }, [uid, hasMore, cursorBefore, items]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const refresh = useCallback(async () => {
    await getMeals();
    await loadFirstPage();
  }, [getMeals, loadFirstPage]);

  const idToIndex = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((m, i) => {
      const id = String((m as any).cloudId || (m as any).mealId || "");
      if (id) map.set(id, i);
    });
    return map;
  }, [items]);

  const visibleItems: Meal[] = useMemo(() => {
    const q = norm(query);
    const base = [...items].sort((a, b) => +getMealDate(b) - +getMealDate(a));

    const byText = !q
      ? base
      : base.filter((m) => {
          const title =
            norm((m as any).title) ||
            norm((m as any).name) ||
            norm((m as any).mealName);
          const ing = norm(
            (m.ingredients || [])
              .map((x: any) => x?.name || x?.title || "")
              .join(" ")
          );
          return title.includes(q) || ing.includes(q);
        });

    if (!filters) return byText;

    return byText.filter((m) => {
      const totals = mealTotals(m);

      if (filters.calories) {
        const [min, max] = filters.calories;
        if (totals.kcal < min || totals.kcal > max) return false;
      }

      if (filters.protein) {
        const [min, max] = filters.protein;
        if (totals.protein < min || totals.protein > max) return false;
      }

      if (filters.carbs) {
        const [min, max] = filters.carbs;
        if (totals.carbs < min || totals.carbs > max) return false;
      }

      if (filters.fat) {
        const [min, max] = filters.fat;
        if (totals.fat < min || totals.fat > max) return false;
      }

      if (filters.dateRange) {
        const d = getMealDate(m);
        const s = new Date(filters.dateRange.start);
        const e = new Date(filters.dateRange.end);
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        if (+d < +s || +d > +e) return false;
      }
      return true;
    });
  }, [items, query, filters]);

  const sections: DaySection[] = useMemo(() => {
    if (!visibleItems.length) return [];
    const byKey = new Map<string, DaySection>();
    const keysInOrder: string[] = [];
    for (const meal of visibleItems) {
      const d = getMealDate(meal);
      const key = fmtDateKey(d);
      if (!byKey.has(key)) {
        byKey.set(key, {
          title: fmtHeader(d, t),
          dateKey: key,
          totalKcal: 0,
          data: [],
        });
        keysInOrder.push(key);
      }
      const sec = byKey.get(key)!;
      sec.data.push(meal);
      sec.totalKcal += mealKcal(meal);
    }
    return keysInOrder.map((k) => {
      const s = byKey.get(k)!;
      return { ...s, totalKcal: Math.round(s.totalKcal) };
    });
  }, [visibleItems, t]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (loadingMoreRef.current || !hasMore) return;
      let maxDataIndex = -1;
      for (const v of viewableItems) {
        const item: any = v.item;
        if (!item) continue;
        const id = String(item.cloudId || item.mealId || "");
        const idx = id ? idToIndex.get(id) ?? -1 : -1;
        if (idx > maxDataIndex) maxDataIndex = idx;
      }
      if (maxDataIndex < 0) return;
      const remaining = items.length - (maxDataIndex + 1);
      if (remaining <= 10) loadMore();
    }
  );

  const onEditMeal = (_mealId: string) => {};
  const onDuplicateMeal = (meal: Meal) => duplicateMeal(meal);
  const onDeleteMeal = (mealCloudId?: string) => {
    if (mealCloudId) deleteMeal(mealCloudId);
  };

  if (loading) return <LoadingSkeleton />;

  if (!sections.length) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {!netInfo.isConnected && <OfflineBanner />}
        {showFilters ? (
          <FilterPanel
            onApply={(payload: Filters) => {
              applyFilters(payload);
            }}
            onClear={() => {
              clearFilters();
            }}
          />
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
        <FilterPanel
          onApply={(payload: Filters) => {
            applyFilters(payload);
          }}
          onClear={() => {
            clearFilters();
          }}
        />
      ) : (
        <View style={{}}>
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
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
            ListFooterComponent={
              loadingMore ? <LoadingSkeleton height={56} /> : null
            }
            stickySectionHeadersEnabled
            removeClippedSubviews
            windowSize={7}
            initialNumToRender={PAGE_SIZE}
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

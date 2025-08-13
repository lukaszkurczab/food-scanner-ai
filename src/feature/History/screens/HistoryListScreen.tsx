import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, SectionList, RefreshControl, Text } from "react-native";
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
import { Layout } from "@/components";
import { getMealsPage } from "@services/mealService";
import { MealListItem } from "../components/MealListItem";

const PAGE_SIZE = 20;

type DaySection = {
  title: string;
  dateKey: string;
  totalKcal: number;
  data: Meal[];
};

const toDate = (val?: string | number | null): Date | null => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const getMealDate = (m: Meal): Date => {
  return (
    toDate(m.timestamp) ||
    toDate(m.updatedAt) ||
    toDate(m.createdAt) ||
    new Date(0)
  );
};

const fmtDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const fmtHeader = (d: Date) => {
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) return "Today";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
};

const mealKcal = (meal: Meal) =>
  meal.ingredients?.reduce((sum, ing) => sum + (ing.kcal || 0), 0) || 0;

export default function HistoryListScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const netInfo = useNetInfo();
  const { uid } = useAuthContext();
  const { duplicateMeal, deleteMeal, getMeals } = useMeals(uid || "");

  const [filterCount, setFilterCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<Meal[]>([]);
  const [cursorBefore, setCursorBefore] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

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
    setHasMore(page.items.length === PAGE_SIZE);
    setLoading(false);
  }, [uid]);

  const loadMore = useCallback(async () => {
    if (!uid || !hasMore || loadingMore) return;
    setLoadingMore(true);
    const page = await getMealsPage(uid, {
      limit: PAGE_SIZE,
      before: cursorBefore,
    });
    setItems((prev) => [...prev, ...page.items]);
    setCursorBefore(page.nextBefore);
    setHasMore(page.items.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [uid, hasMore, loadingMore, cursorBefore]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const refresh = useCallback(async () => {
    await getMeals();
    await loadFirstPage();
  }, [getMeals, loadFirstPage]);

  // grupowanie per dzień (kolejność zachowana: najnowsze -> najstarsze)
  const sections: DaySection[] = useMemo(() => {
    if (!items.length) return [];

    const byKey = new Map<string, DaySection>();
    const keysInOrder: string[] = [];

    for (const meal of items) {
      const d = getMealDate(meal);
      const key = fmtDateKey(d);

      if (!byKey.has(key)) {
        byKey.set(key, {
          title: fmtHeader(d),
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
  }, [items]);

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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            padding: theme.spacing.md,
          }}
        >
          <FilterBadgeButton
            activeCount={filterCount}
            onPress={() => setShowFilters(!showFilters)}
          />
        </View>
        {showFilters ? (
          <FilterPanel
            onApply={(filters) => {
              setFilterCount(
                Object.values(filters || {}).filter(Boolean).length
              );
              setShowFilters(false);
            }}
            onClear={() => {
              setFilterCount(0);
              setShowFilters(false);
            }}
          />
        ) : (
          <EmptyState
            title="No meals found"
            description="Try changing filters or date"
          />
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
        {total} kcal
      </Text>
    </View>
  );

  return (
    <Layout>
      {!netInfo.isConnected && <OfflineBanner />}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          padding: theme.spacing.md,
        }}
      >
        <FilterBadgeButton
          activeCount={filterCount}
          onPress={() => setShowFilters(!showFilters)}
        />
      </View>

      {showFilters ? (
        <FilterPanel
          onApply={(filters) => {
            setFilterCount(Object.values(filters || {}).filter(Boolean).length);
            setShowFilters(false);
          }}
          onClear={() => {
            setFilterCount(0);
            setShowFilters(false);
          }}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.cloudId || item.mealId}
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
                onEdit={() => onEditMeal(item.cloudId || item.mealId)}
                onDuplicate={() => onDuplicateMeal(item)}
                onDelete={() => onDeleteMeal(item.cloudId)}
              />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
          onEndReachedThreshold={0.2}
          onEndReached={loadMore}
          ListFooterComponent={
            loadingMore ? <LoadingSkeleton height={56} /> : null
          }
          stickySectionHeadersEnabled
        />
      )}
    </Layout>
  );
}

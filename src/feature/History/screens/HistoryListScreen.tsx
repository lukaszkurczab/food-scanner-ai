import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals } from "@hooks/useMeals";
import type { Meal } from "@/types/meal";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { DateHeaderWithCalendarButton } from "../components/DateHeaderWithCalendarButton";
import { MealListItem } from "../components/MealListItem";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { FilterPanel } from "../components/FilterPanel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useNetInfo } from "@react-native-community/netinfo";
import { Layout } from "@/components";
import { getMealsPage } from "@services/mealService";

const PAGE_SIZE = 20;

export default function HistoryListScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const netInfo = useNetInfo();
  const { uid } = useAuthContext();
  const { duplicateMeal, deleteMeal, getMeals } = useMeals(uid || "");

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterCount, setFilterCount] = useState(0);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<Meal[]>([]);
  const [cursorBefore, setCursorBefore] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const dateLabel = useMemo(
    () => (selectedDate || new Date()).toLocaleDateString(),
    [selectedDate]
  );

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

  const filtered = useMemo(() => {
    let list = items;
    if (selectedDate) {
      const target = selectedDate.toDateString();
      list = list.filter(
        (m) => new Date(m.timestamp).toDateString() === target
      );
    }
    return list;
  }, [items, selectedDate]);

  const onEditMeal = (mealId: string) => {};
  const onDuplicateMeal = (meal: Meal) => duplicateMeal(meal);
  const onDeleteMeal = (mealCloudId?: string) => {
    if (mealCloudId) deleteMeal(mealCloudId);
  };

  if (loading) return <LoadingSkeleton />;

  if (!filtered.length) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {!netInfo.isConnected && <OfflineBanner />}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            padding: 16,
          }}
        >
          <DateHeaderWithCalendarButton
            dateLabel={dateLabel}
            onOpenCalendar={() => {}}
          />
          <FilterBadgeButton activeCount={filterCount} onPress={() => {}} />
        </View>
        <EmptyState
          title="No meals found"
          description="Try changing filters or date"
        />
      </View>
    );
  }

  return (
    <Layout>
      {!netInfo.isConnected && <OfflineBanner />}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          padding: 16,
        }}
      >
        <FilterBadgeButton
          activeCount={filterCount}
          onPress={() => setShowFilters(!showFilters)}
        />
      </View>
      {showFilters ? (
        <FilterPanel
          onApply={function (filters: any): void {
            throw new Error("Function not implemented.");
          }}
          onClear={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.cloudId || item.mealId}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
          renderItem={({ item }) => (
            <MealListItem
              meal={item}
              onPress={() => navigation.navigate("MealDetails", { meal: item })}
              onEdit={() => onEditMeal(item.cloudId || item.mealId)}
              onDuplicate={() => onDuplicateMeal(item)}
              onDelete={() => onDeleteMeal(item.cloudId)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          onEndReachedThreshold={0.2}
          onEndReached={loadMore}
          ListFooterComponent={
            loadingMore ? <LoadingSkeleton height={56} /> : null
          }
        />
      )}
    </Layout>
  );
}

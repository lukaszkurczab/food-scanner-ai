import React, { useMemo, useState } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { useMeals } from "@/src/hooks/useMeals";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { DateHeaderWithCalendarButton } from "../components/DateHeaderWithCalendarButton";
import { MealListItem } from "../components/MealListItem";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { OfflineBanner } from "@/src/components/OfflineBanner";
import { useNetInfo } from "@react-native-community/netinfo";
import { useUserContext } from "@/src/context/UserContext";

export default function HistoryListScreen() {
  const theme = useTheme();
  const netInfo = useNetInfo();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterCount, setFilterCount] = useState(0);
  const { meals, loadingMeals } = useUserContext();
  const { getMeals, duplicateMeal, deleteMeal } = useMeals("USER_UID");

  const dateLabel = useMemo(
    () => selectedDate.toLocaleDateString(),
    [selectedDate]
  );

  const mealsForDay = useMemo(
    () =>
      meals.filter(
        (m) =>
          new Date(m.timestamp).toDateString() === selectedDate.toDateString()
      ),
    [meals, selectedDate]
  );

  const onEditMeal = (mealId: string) => {};
  const onDuplicateMeal = (meal: any) => duplicateMeal(meal);
  const onDeleteMeal = (mealCloudId?: string) => {
    if (mealCloudId) deleteMeal(mealCloudId);
  };

  if (loadingMeals) return <LoadingSkeleton />;

  if (!mealsForDay.length)
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
      <FlatList
        data={mealsForDay}
        keyExtractor={(item) => item.cloudId || item.mealId}
        refreshControl={
          <RefreshControl refreshing={loadingMeals} onRefresh={getMeals} />
        }
        renderItem={({ item }) => (
          <MealListItem
            meal={item}
            onPress={() => onEditMeal(item.cloudId || item.mealId)}
            onEdit={() => onEditMeal(item.cloudId || item.mealId)}
            onDuplicate={() => onDuplicateMeal(item)}
            onDelete={() => onDeleteMeal(item.cloudId)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
      />
    </View>
  );
}

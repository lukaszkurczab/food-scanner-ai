import React, { useMemo, useState } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useMeals } from "@hooks/useMeals";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { DateHeaderWithCalendarButton } from "../components/DateHeaderWithCalendarButton";
import { MealListItem } from "../components/MealListItem";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useNetInfo } from "@react-native-community/netinfo";
import { useUserContext } from "@contexts/UserContext";
import { Layout } from "@/components";

type HistoryListScreenProps = {
  navigation: any;
};

export default function HistoryListScreen({
  navigation,
}: HistoryListScreenProps) {
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

  if (!meals.length)
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
    <Layout>
      {!netInfo.isConnected && <OfflineBanner />}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          padding: 16,
        }}
      >
        <FilterBadgeButton activeCount={filterCount} onPress={() => {}} />
      </View>
      <FlatList
        data={meals.reverse()}
        keyExtractor={(item) => item.cloudId || item.mealId}
        refreshControl={
          <RefreshControl refreshing={loadingMeals} onRefresh={getMeals} />
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
      />
    </Layout>
  );
}

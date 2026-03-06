import { useCallback, useMemo } from "react";
import { View, FlatList, RefreshControl, StyleSheet } from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import type { Meal } from "@/types/meal";
import { EmptyState } from "../components/EmptyState";
import { FullScreenLoader, Layout } from "@/components";
import { SearchBox } from "@/components/SearchBox";
import { MealListItem } from "@/components/MealListItem";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useTranslation } from "react-i18next";
import { useSelectSavedMealsState } from "@/feature/Meals/hooks/useSelectSavedMealsState";
import { syncMyMeals } from "@/services/myMealService";
import type { RootStackParamList } from "@/navigation/navigate";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";

type SelectSavedMealNavigation = StackNavigationProp<
  RootStackParamList,
  "SelectSavedMeal"
>;

export default function SelectSavedMealScreen({
  navigation,
}: {
  navigation: SelectSavedMealNavigation;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { uid } = useAuthContext();
  const {
    meal: draftMeal,
    setMeal,
    saveDraft,
    setLastScreen,
  } = useMealDraftContext();
  const { t } = useTranslation(["meals"]);

  const {
    step,
    queryText,
    setQueryText,
    loading,
    pageItems,
    selectedId,
    refresh,
    handleSelect,
    handleConfirm,
    handleStartOver,
    keyExtractor,
    onViewableItemsChanged,
    viewabilityConfig,
  } = useSelectSavedMealsState({
    uid,
    syncSavedMeals: () => syncMyMeals(uid),
    draftMeal,
    setMeal,
    saveDraft,
    setLastScreen,
    onNavigateResult: () => navigation.navigate("AddMeal", { start: "Result" }),
    onStartOver: () => navigation.replace("MealAddMethod"),
  });

  const renderItem = useCallback(
    ({ item }: { item: Meal }) => {
      const id = item.cloudId || item.mealId;
      const selected = selectedId === id;
      return (
        <View style={styles.listItemWrap}>
          <MealListItem
            meal={item}
            onPress={() => handleSelect(item)}
            onSelect={() => handleSelect(item)}
            selected={selected}
            onDuplicate={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </View>
      );
    },
    [handleSelect, selectedId, styles],
  );

  if (loading) {
    return (
      <Layout disableScroll>
        <FullScreenLoader />
      </Layout>
    );
  }

  if (!pageItems.length) {
    return (
      <Layout>
        <View style={styles.searchWrap}>
          <SearchBox value={queryText} onChange={setQueryText} />
        </View>
        <EmptyState
          title={t("meals:noSavedMeals", "No saved meals")}
          description={
            queryText
              ? t("meals:tryDifferentSearch", "Try a different search.")
              : t("meals:saveMealsToReuse", "Save meals to reuse them later.")
          }
        />
        <GlobalActionButtons
          label={t("meals:select", "Select")}
          onPress={() => {}}
          primaryDisabled
          secondaryLabel={t("meals:select_method", "Start over")}
          secondaryOnPress={handleStartOver}
        />
      </Layout>
    );
  }

  return (
    <Layout disableScroll>
      <View style={styles.searchWrap}>
        <SearchBox value={queryText} onChange={setQueryText} />
      </View>
      <FlatList
        data={pageItems}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews
        initialNumToRender={step}
        windowSize={7}
      />
      <GlobalActionButtons
        label={t("meals:select", "Select")}
        onPress={handleConfirm}
        primaryDisabled={!selectedId}
        secondaryLabel={t("meals:select_method", "Start over")}
        secondaryOnPress={handleStartOver}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    listItemWrap: {
      marginBottom: theme.spacing.sm,
    },
    searchWrap: { paddingVertical: theme.spacing.md },
    listContent: { paddingBottom: theme.spacing.lg },
  });

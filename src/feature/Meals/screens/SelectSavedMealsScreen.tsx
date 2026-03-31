import { useCallback, useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import type { Meal } from "@/types/meal";
import { EmptyState } from "../components/EmptyState";
import { Button, FullScreenLoader, Layout, TextButton } from "@/components";
import { SearchBox } from "@/components/SearchBox";
import { MealListItem } from "@/components/MealListItem";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useTranslation } from "react-i18next";
import { useSelectSavedMealsState } from "@/feature/Meals/hooks/useSelectSavedMealsState";
import { syncMyMeals } from "@/services/meals/myMealService";
import type { RootStackParamList } from "@/navigation/navigate";

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
  const { t } = useTranslation(["meals", "common"]);
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;

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
    onNavigateReview: () =>
      navigation.navigate("AddMeal", { start: "ReviewMeal" }),
    onStartOver: () =>
      navigation.navigate("MealAddMethod", {
        selectionMode: "temporary",
      }),
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
    const isOfflineEmpty = !isOnline && !queryText.trim();
    return (
      <Layout>
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>
            {t("saved_list_eyebrow", "Saved meals")}
          </Text>
          <Text style={styles.title}>
            {t("saved_list_title", "Reuse one of your saved meals")}
          </Text>
          <Text style={styles.subtitle}>
            {t(
              "saved_list_subtitle",
              "Pick a saved meal, review it, and log it again when you're ready.",
            )}
          </Text>
        </View>
        <View style={styles.searchWrap}>
          <SearchBox value={queryText} onChange={setQueryText} />
        </View>
        <EmptyState
          title={
            isOfflineEmpty
              ? t("common:offline.title")
              : queryText
                ? t("meals:noMealsFound", "No meals found")
                : t("meals:noSavedMeals", "No saved meals")
          }
          description={
            isOfflineEmpty
              ? t("savedMeals.offlineEmpty", { ns: "meals" })
              : queryText
                ? t("meals:tryDifferentSearch", "Try a different search.")
                : t("meals:saveMealsToReuse", "Save meals to reuse them later.")
          }
        />
        <Button
          label={t("meals:change_method", "Change add method")}
          onPress={handleStartOver}
          style={styles.primaryAction}
        />
      </Layout>
    );
  }

  return (
    <Layout disableScroll>
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>
          {t("saved_list_eyebrow", "Saved meals")}
        </Text>
        <Text style={styles.title}>
          {t("saved_list_title", "Reuse one of your saved meals")}
        </Text>
        <Text style={styles.subtitle}>
          {t(
            "saved_list_subtitle",
            "Pick a saved meal, review it, and log it again when you're ready.",
          )}
        </Text>
      </View>
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
      <Button
        label={t("saved_list_use_cta", "Review selected meal")}
        onPress={handleConfirm}
        disabled={!selectedId}
        style={styles.primaryAction}
      />
      <TextButton
        label={t("meals:change_method", "Change add method")}
        onPress={handleStartOver}
        style={styles.secondaryAction}
        tone="link"
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    headerBlock: {
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
    },
    eyebrow: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.labelS,
      lineHeight: theme.typography.lineHeight.labelS,
      fontFamily: theme.typography.fontFamily.medium,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
    },
    listItemWrap: {
      marginBottom: theme.spacing.sm,
    },
    searchWrap: { paddingVertical: theme.spacing.md },
    listContent: { paddingBottom: theme.spacing.lg },
    primaryAction: {
      marginTop: theme.spacing.sm,
    },
    secondaryAction: {
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
  });

import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import {
  FullScreenLoader,
  Layout,
  SearchBox,
} from "@/components";
import { MealListItem } from "@/components/MealListItem";
import { useAuthContext } from "@/context/AuthContext";
import { useFilters } from "@/context/HistoryContext";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useTheme } from "@/theme/useTheme";
import type { Meal } from "@/types/meal";
import { EmptyState } from "../components/EmptyState";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { FilterPanel } from "../components/FilterPanel";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useSavedMealsData } from "@/feature/History/hooks/useSavedMealsData";
import { syncMyMeals } from "@/services/meals/myMealService";
import type { RootStackParamList } from "@/navigation/navigate";

type SavedMealsNavigation = StackNavigationProp<RootStackParamList, "SavedMeals">;

export default function SavedMealsScreen({
  navigation,
}: {
  navigation: SavedMealsNavigation;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;
  const { uid } = useAuthContext();
  const { t } = useTranslation(["meals", "common"]);
  const {
    meal: draftMeal,
    setMeal,
    saveDraft,
    setLastScreen,
  } = useMealDraftContext();

  const {
    query,
    setQuery,
    filters,
    showFilters,
    toggleShowFilters,
    filterCount,
  } = useFilters("myMeals");

  const {
    pageSize,
    loading,
    loadingMore,
    validating,
    errorKind,
    dataState,
    visibleItems,
    refresh,
    onDelete,
    onViewableItemsChanged,
    viewabilityConfig,
  } = useSavedMealsData({
    uid,
    query,
    filters,
    isOnline,
    syncSavedMeals: () => syncMyMeals(uid),
  });

  const buildDraftFromSaved = useCallback(
    (picked: Meal): Meal => {
      const now = new Date().toISOString();
      const base: Meal = draftMeal ?? {
        mealId: uuidv4(),
        userUid: uid ?? "",
        name: "",
        photoUrl: null,
        ingredients: [],
        createdAt: now,
        updatedAt: now,
        syncState: "pending",
        tags: [],
        deleted: false,
        notes: null,
        type: "other",
        timestamp: "",
        source: null,
        inputMethod: null,
        aiMeta: null,
      };

      return {
        ...base,
        mealId: uuidv4(),
        source: "saved",
        inputMethod: "saved",
        aiMeta: null,
        ingredients: Array.isArray(picked.ingredients)
          ? picked.ingredients
          : [],
        photoLocalPath: picked.photoLocalPath ?? null,
        photoUrl: picked.photoLocalPath ?? picked.photoUrl ?? null,
        updatedAt: now,
        name: picked.name ?? "",
      };
    },
    [draftMeal, uid],
  );

  const onDuplicate = useCallback(
    async (meal: Meal) => {
      if (!uid) return;
      const next = buildDraftFromSaved(meal);
      setMeal(next);
      await saveDraft(uid);
      await setLastScreen(uid, "Result");
      navigation.navigate("AddMeal", { start: "Result" });
    },
    [uid, buildDraftFromSaved, setMeal, saveDraft, setLastScreen, navigation],
  );

  const onEdit = useCallback(
    async (meal: Meal) => {
      if (!uid) return;
      const next = buildDraftFromSaved(meal);
      setMeal(next);
      await saveDraft(uid);
      await setLastScreen(uid, "EditReviewIngredients");
      navigation.navigate("EditReviewIngredients", {
        savedCloudId: meal.cloudId,
      });
    },
    [uid, buildDraftFromSaved, setMeal, saveDraft, setLastScreen, navigation],
  );

  const keyExtractor = useCallback(
    (item: Meal) => item.cloudId || item.mealId,
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Meal }) => (
      <View style={styles.listItemWrap}>
        <MealListItem
          meal={item}
          onPress={() => navigation.navigate("MealDetails", { meal: item })}
          onDuplicate={() => onDuplicate(item)}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item)}
        />
      </View>
    ),
    [navigation, onDelete, onDuplicate, onEdit, styles],
  );

  if (dataState === "loading") {
    return (
      <Layout disableScroll>
        <FullScreenLoader />
      </Layout>
    );
  }

  if (dataState !== "ready") {
    const errorMessage =
      errorKind === "load"
        ? t("savedMeals.loadError", { ns: "meals" })
        : errorKind === "loadMore"
          ? t("savedMeals.loadMoreError", { ns: "meals" })
          : errorKind === "refresh"
            ? t("savedMeals.refreshError", { ns: "meals" })
            : t("common:unknownError");

    const emptyTitle =
      dataState === "error"
        ? t("savedMeals.errorTitle", { ns: "meals" })
        : t("meals:noSavedMeals", "No saved meals");
    const emptyDescription =
      dataState === "error"
        ? errorMessage
        : dataState === "offline-empty"
          ? t("savedMeals.offlineEmpty", { ns: "meals" })
          : query
            ? t("meals:tryDifferentSearch", "Try a different search.")
            : t("meals:saveMealsToReuse", "Save meals to reuse them later.");

    return (
      <Layout disableScroll>
        {showFilters ? (
          <FilterPanel scope="myMeals" />
        ) : (
          <>
            <SearchBox value={query} onChange={setQuery} />
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </>
        )}
      </Layout>
    );
  }

  return (
    <Layout disableScroll>
      {showFilters ? (
        <View style={styles.filtersWrap}>
          <FilterPanel scope="myMeals" />
        </View>
      ) : (
        <View style={styles.topBarWrap}>
          <View style={styles.row}>
            <SearchBox value={query} onChange={setQuery} style={styles.searchBox} />
            <FilterBadgeButton
              activeCount={filterCount}
              onPress={toggleShowFilters}
            />
          </View>
        </View>
      )}
      {!showFilters && (
        <>
          {validating && (
            <View style={styles.validatingWrap}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
          <FlatList
            data={visibleItems}
            keyExtractor={keyExtractor}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refresh} />
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig}
            ListFooterComponent={
              loadingMore ? <LoadingSkeleton height={56} /> : null
            }
            removeClippedSubviews
            windowSize={7}
            initialNumToRender={pageSize}
          />
        </>
      )}
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    filtersWrap: { height: "100%", paddingBottom: theme.spacing.nav },
    topBarWrap: { padding: theme.spacing.md, gap: theme.spacing.sm },
    row: { flexDirection: "row", gap: theme.spacing.sm },
    searchBox: { flex: 1 },
    validatingWrap: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.xs,
    },
    listContent: { paddingBottom: theme.spacing.lg },
    listItemWrap: { marginBottom: theme.spacing.sm },
  });

import React, { useCallback, useMemo } from "react";
import type { StackNavigationProp } from "@react-navigation/stack";
import {
  View,
  SectionList,
  RefreshControl,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Layout, SearchBox } from "@/components";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { FilterPanel } from "../components/FilterPanel";
import { MealListItem } from "@/components/MealListItem";
import type { Meal } from "@/types/meal";
import type { DaySection } from "@/feature/History/types/daySection";
import { useHistoryListState } from "@/feature/History/hooks/useHistoryListState";
import { FREE_WINDOW_DAYS } from "@/services/mealService";
import type { RootStackParamList } from "@/navigation/navigate";


type SectionHeaderProps = {
  title: string;
  total: number;
  theme: ReturnType<typeof useTheme>;
  kcalLabel: string;
};

const SectionHeaderComponent = ({
  title,
  total,
  theme,
  kcalLabel,
}: SectionHeaderProps) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
      {title}
      </Text>
      <Text style={styles.sectionTotal}>
      {total} {kcalLabel}
      </Text>
    </View>
  );
};

const SectionHeader = React.memo(SectionHeaderComponent);
SectionHeader.displayName = "SectionHeader";

const MemoMealListItem = React.memo(MealListItem);

type HistoryRowProps = {
  meal: Meal;
  onPress: (meal: Meal) => void;
  theme: ReturnType<typeof useTheme>;
};

const HistoryRowComponent = ({ meal, onPress, theme }: HistoryRowProps) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.mealRow}>
      <MemoMealListItem
        meal={meal}
        onPress={() => onPress(meal)}
        onEdit={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
      />
    </View>
  );
};

const HistoryRow = React.memo(
  HistoryRowComponent,
  (prev, next) => prev.meal === next.meal,
);
HistoryRow.displayName = "HistoryRow";

export default function HistoryListScreen({
  navigation,
}: {
  navigation: StackNavigationProp<RootStackParamList, "HistoryList">;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const state = useHistoryListState({ navigation });

  const renderSectionHeader = useCallback(
    ({ section }: { section: DaySection }) => (
      <SectionHeader
        title={section.title}
        total={section.totalKcal}
        theme={theme}
        kcalLabel={state.kcalLabel}
      />
    ),
    [theme, state.kcalLabel],
  );

  const renderItem = useCallback(
    ({ item }: { item: Meal }) => (
      <HistoryRow meal={item} onPress={state.onMealPress} theme={theme} />
    ),
    [state.onMealPress, theme],
  );

  if (state.dataState === "loading") {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (state.dataState !== "ready") {
    return (
      <Layout>
        {state.showFilters ? (
          <FilterPanel
            scope="history"
            isPremium={state.isPremium}
            windowDays={FREE_WINDOW_DAYS}
            onUpgrade={state.onUpgrade}
          />
        ) : (
          <>
            <SearchBox value={state.query} onChange={state.setQuery} />
            <EmptyState
              title={state.emptyState?.title || ""}
              description={state.emptyState?.description || ""}
            />
          </>
        )}
      </Layout>
    );
  }

  return (
    <Layout disableScroll>
      {state.showFilters ? (
        <View style={styles.fullHeight}>
          <FilterPanel
            scope="history"
            isPremium={state.isPremium}
            windowDays={FREE_WINDOW_DAYS}
            onUpgrade={state.onUpgrade}
          />
        </View>
      ) : (
        <>
          <View
            style={[
              styles.topBar,
              styles.topBarSpacing,
            ]}
          >
            <SearchBox
              value={state.query}
              onChange={state.setQuery}
              style={styles.searchBox}
            />
            <FilterBadgeButton
              activeCount={state.filterCount}
              onPress={state.toggleShowFilters}
            />
          </View>
          <SectionList
            sections={state.sections}
            keyExtractor={state.keyExtractor}
            refreshControl={
              <RefreshControl refreshing={state.loading} onRefresh={state.refresh} />
            }
            renderSectionHeader={renderSectionHeader}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onEndReached={state.onEndReached}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              state.loadingMore ? <LoadingSkeleton height={56} /> : null
            }
            stickySectionHeadersEnabled
            removeClippedSubviews
            windowSize={7}
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={60}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
          />
        </>
      )}
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    loadingState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingBottom: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    sectionTotal: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.regular,
    },
    mealRow: { marginBottom: theme.spacing.sm },
    topBar: { flexDirection: "row" },
    searchBox: { flex: 1 },
    topBarSpacing: {
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    listContent: { paddingBottom: theme.spacing.lg },
    fullHeight: { height: "100%" },
  });

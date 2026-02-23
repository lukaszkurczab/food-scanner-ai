import React, { useCallback } from "react";
import type { ParamListBase } from "@react-navigation/native";
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
import { Layout, SearchBox, SyncStatusBadge } from "@/components";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { FilterPanel } from "../components/FilterPanel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { MealListItem } from "@/components/MealListItem";
import type { Meal } from "@/types/meal";
import type { DaySection } from "@/feature/History/types/daySection";
import { useHistoryListState } from "@/feature/History/hooks/useHistoryListState";
import { FREE_WINDOW_DAYS } from "@/services/mealService";


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
}: SectionHeaderProps) => (
  <View
    style={[
      styles.sectionHeader,
      {
        paddingBottom: theme.spacing.sm,
      },
    ]}
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
      {total} {kcalLabel}
    </Text>
  </View>
);

const SectionHeader = React.memo(SectionHeaderComponent);
SectionHeader.displayName = "SectionHeader";

const MemoMealListItem = React.memo(MealListItem);

type HistoryRowProps = {
  meal: Meal;
  onPress: (meal: Meal) => void;
  theme: ReturnType<typeof useTheme>;
};

const HistoryRowComponent = ({ meal, onPress, theme }: HistoryRowProps) => (
  <View
    style={{
      marginBottom: theme.spacing.sm,
    }}
  >
    <MemoMealListItem
      meal={meal}
      onPress={() => onPress(meal)}
      onEdit={() => {}}
      onDuplicate={() => {}}
      onDelete={() => {}}
    />
  </View>
);

const HistoryRow = React.memo(
  HistoryRowComponent,
  (prev, next) => prev.meal === next.meal,
);
HistoryRow.displayName = "HistoryRow";

export default function HistoryListScreen({
  navigation,
}: {
  navigation: StackNavigationProp<ParamListBase>;
}) {
  const theme = useTheme();

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
      <View style={[styles.centerBoth, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (state.dataState !== "ready") {
    return (
      <Layout>
        {!state.isOnline && <OfflineBanner />}
        <SyncStatusBadge status={state.syncStatus} />
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
      {!state.isOnline && <OfflineBanner />}
      <SyncStatusBadge status={state.syncStatus} />
      {state.showFilters ? (
        <View style={{ height: "100%" }}>
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
              {
                marginBottom: theme.spacing.md,
                gap: theme.spacing.sm,
              },
            ]}
          >
            <SearchBox value={state.query} onChange={state.setQuery} />
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
            contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
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

const styles = StyleSheet.create({
  centerBoth: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  topBar: {
    flexDirection: "row",
  },
});

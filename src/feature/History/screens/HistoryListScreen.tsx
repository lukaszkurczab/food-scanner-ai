import React, { useCallback, useMemo } from "react";
import type { StackNavigationProp } from "@react-navigation/stack";
import {
  View,
  SectionList,
  RefreshControl,
  Text,
  Pressable,
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
import { FREE_WINDOW_DAYS } from "@/services/meals/mealService";
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
      <Text style={styles.sectionTitle}>{title}</Text>
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
  (prev, next) =>
    prev.meal === next.meal &&
    prev.onPress === next.onPress &&
    prev.theme.mode === next.theme.mode,
);
HistoryRow.displayName = "HistoryRow";

type DeadLetterBannerProps = {
  title: string;
  description: string;
  actionLabel: string;
  retrying: boolean;
  onRetry: () => void;
  theme: ReturnType<typeof useTheme>;
};

const DeadLetterBannerComponent = ({
  title,
  description,
  actionLabel,
  retrying,
  onRetry,
  theme,
}: DeadLetterBannerProps) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.deadLetterBanner}>
      <View style={styles.deadLetterTextWrap}>
        <Text style={styles.deadLetterTitle}>{title}</Text>
        <Text style={styles.deadLetterDescription}>{description}</Text>
      </View>
      <View style={styles.deadLetterActionWrap}>
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          style={({ pressed }) => [
            styles.deadLetterActionButton,
            retrying && styles.deadLetterActionButtonDisabled,
            pressed && !retrying ? styles.deadLetterActionButtonPressed : null,
          ]}
        >
          <Text style={styles.deadLetterAction}>
            {retrying ? "…" : actionLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const DeadLetterBanner = React.memo(DeadLetterBannerComponent);
DeadLetterBanner.displayName = "DeadLetterBanner";

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

  const deadLetterBanner = state.deadLetterBanner ? (
    <DeadLetterBanner
      title={state.deadLetterBanner.title}
      description={state.deadLetterBanner.description}
      actionLabel={state.deadLetterBanner.actionLabel}
      retrying={state.retryingFailedSync}
      onRetry={state.retryFailedSyncOps}
      theme={theme}
    />
  ) : null;

  if (state.dataState === "loading") {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (state.dataState !== "ready") {
    return (
      <Layout>
        {deadLetterBanner}
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
      {deadLetterBanner}
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
          <View style={[styles.topBar, styles.topBarSpacing]}>
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
              <RefreshControl
                refreshing={state.loading}
                onRefresh={state.refresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
                progressBackgroundColor={theme.surface}
              />
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
    fullHeight: {
      flex: 1,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    topBarSpacing: {
      marginBottom: theme.spacing.lg,
    },
    searchBox: {
      flex: 1,
    },
    listContent: {
      paddingBottom: theme.spacing.sectionGapLarge,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      backgroundColor: theme.background,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    sectionTotal: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.labelL,
      lineHeight: theme.typography.lineHeight.labelL,
      fontFamily: theme.typography.fontFamily.medium,
    },
    deadLetterBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.cardPadding,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.warning.main,
      backgroundColor: theme.warning.surface,
      borderRadius: theme.rounded.lg,
      shadowColor: theme.shadow,
      shadowOpacity: theme.isDark ? 0.18 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: theme.isDark ? 0 : 1,
    },
    deadLetterTextWrap: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    deadLetterTitle: {
      color: theme.warning.text,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
    },
    deadLetterDescription: {
      color: theme.warning.text,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    deadLetterActionWrap: {
      alignItems: "flex-end",
      justifyContent: "center",
    },
    deadLetterActionButton: {
      minHeight: 36,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.rounded.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.borderSoft,
    },
    deadLetterActionButtonDisabled: {
      opacity: 0.6,
    },
    deadLetterActionButtonPressed: {
      opacity: 0.85,
    },
    deadLetterAction: {
      color: theme.primary,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.labelL,
      lineHeight: theme.typography.lineHeight.labelL,
    },
    mealRow: {
      marginBottom: theme.spacing.sm,
    },
  });

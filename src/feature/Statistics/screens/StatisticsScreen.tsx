import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { Layout, FullScreenLoader } from "@/components";
import { usePremiumContext } from "@/context/PremiumContext";
import { useUserContext } from "@contexts/UserContext";
import { useTheme } from "@/theme/useTheme";
import type { RootStackParamList } from "@/navigation/navigate";
import { FREE_WINDOW_DAYS } from "@/services/meals/mealService";
import { useStatisticsState } from "@/feature/Statistics/hooks/useStatisticsState";
import type { RangeKey } from "@/feature/Statistics/types";
import { StatisticsRangeSwitcher } from "@/feature/Statistics/components/StatisticsRangeSwitcher";
import { StatisticsCustomRangeControl } from "@/feature/Statistics/components/StatisticsCustomRangeControl";
import { StatisticsTrendCard } from "@/feature/Statistics/components/StatisticsTrendCard";
import { StatisticsDailyAveragesSection } from "@/feature/Statistics/components/StatisticsDailyAveragesSection";
import { StatisticsMacroBreakdownCard } from "@/feature/Statistics/components/StatisticsMacroBreakdownCard";
import { StatisticsPremiumBanner } from "@/feature/Statistics/components/StatisticsPremiumBanner";
import { StatisticsEmptyState } from "@/feature/Statistics/components/StatisticsEmptyState";

type StatisticsNavigation = StackNavigationProp<RootStackParamList, "Statistics">;
type Props = {
  navigation: StatisticsNavigation;
};

export default function StatisticsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["statistics", "common"]);
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;

  const { userData } = useUserContext();
  const { isPremium } = usePremiumContext();

  const uid = userData?.uid || "";
  const premiumActive = isPremium === true;
  const accessWindowDays = premiumActive ? undefined : FREE_WINDOW_DAYS;

  const state = useStatisticsState({
    uid,
    calorieTarget: userData?.calorieTarget ?? null,
    accessWindowDays,
  });

  const showAnalytics = state.emptyKind === "none";

  return (
    <Layout disableScroll style={styles.layout} showOfflineBanner={showAnalytics}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("statistics:title")}</Text>
          <Text style={styles.subtitle}>{t("statistics:subtitle")}</Text>
        </View>

        <StatisticsRangeSwitcher
          active={state.active}
          options={[
            { key: "7d", label: t("statistics:ranges.7d") },
            { key: "30d", label: t("statistics:ranges.30d") },
            { key: "custom", label: t("statistics:ranges.custom") },
          ]}
          onChange={(next) => state.setActive(next as RangeKey)}
        />

        {state.active === "custom" ? (
          <StatisticsCustomRangeControl
            range={state.customRange}
            onApply={(range) => {
              state.setCustomRange(range);
              state.setActive("custom");
            }}
          />
        ) : null}

        <View style={styles.content}>
          {state.loadingMeals ? (
            <FullScreenLoader label={t("common:loading")} />
          ) : showAnalytics ? (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <StatisticsTrendCard
                metric={state.metric}
                metricAverage={state.metricAverage}
                labels={state.labels}
                series={state.selectedSeries}
                onChangeMetric={state.setMetric}
              />

              <StatisticsDailyAveragesSection
                avgKcal={state.avgKcal}
                avgProtein={state.avgProtein}
                avgCarbs={state.avgCarbs}
                avgFat={state.avgFat}
              />

              {state.hasTotals ? (
                <StatisticsMacroBreakdownCard
                  protein={state.totals.protein}
                  carbs={state.totals.carbs}
                  fat={state.totals.fat}
                />
              ) : null}

              {!premiumActive && accessWindowDays && state.isWindowLimited ? (
                <StatisticsPremiumBanner
                  days={accessWindowDays}
                  onPress={() => navigation.navigate("ManageSubscription")}
                />
              ) : null}
            </ScrollView>
          ) : (
            <StatisticsEmptyState kind={state.emptyKind} isOffline={!isOnline} />
          )}
        </View>
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    layout: {
      paddingLeft: theme.spacing.screenPadding,
      paddingRight: theme.spacing.screenPadding,
    },
    container: {
      flex: 1,
    },
    header: {
      marginTop: theme.spacing.xs,
      gap: theme.spacing.xxs,
      marginBottom: theme.spacing.sm,
    },
    title: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.h1,
      lineHeight: theme.typography.lineHeight.h1,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    content: {
      flex: 1,
      marginTop: theme.spacing.sm,
    },
    scrollContent: {
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.md,
    },
  });

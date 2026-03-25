import { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@contexts/UserContext";
import { RangeTabs } from "../components/RangeTabs";
import { MetricsGrid } from "../components/MetricsGrid";
import { LineSection } from "../components/LineSection";
import { MacroPieCard } from "../components/MacroPieCard";
import { ProgressAveragesCard } from "../components/ProgressAveragesCard";
import { Button, DateInput, Layout } from "@/components";
import { useTranslation } from "react-i18next";
import { usePremiumContext } from "@/context/PremiumContext";
import { FREE_WINDOW_DAYS } from "@/services/meals/mealService";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import {
  useStatisticsState,
  type RangeKey,
} from "@/feature/Statistics/hooks/useStatisticsState";

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

  return (
    <Layout>
      <View style={styles.header}>
        <RangeTabs
          options={[
            { key: "7d", label: t("statistics:ranges.7d") },
            { key: "30d", label: t("statistics:ranges.30d") },
            { key: "custom", label: t("statistics:ranges.custom") },
          ]}
          active={state.active}
          onChange={(key) => state.setActive(key as RangeKey)}
        />
        {state.active === "custom" && (
          <View style={styles.customRange}>
            <DateInput
              range={state.customRange}
              onChange={state.setCustomRange}
              allowSingleDay
            />
          </View>
        )}
      </View>

      {!premiumActive && accessWindowDays && state.isWindowLimited && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            {t(
              "statistics:limitedWindowTitle",
              "Dostęp do starszych danych wymaga Premium",
            )}
          </Text>
          <Text style={styles.bannerText}>
            {t("statistics:limitedWindowDesc", {
              defaultValue: "Zakres został skrócony do ostatnich {{d}} dni.",
              d: accessWindowDays,
            })}
          </Text>
          <Button
            label={t("statistics:upgrade", "Odblokuj Premium")}
            onPress={() => navigation.navigate("ManageSubscription")}
            style={styles.bannerCta}
          />
        </View>
      )}

      {state.loadingMeals ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.loadingText}>
            {t("common:loading")}
          </Text>
        </View>
      ) : state.empty ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>
            {isOnline
              ? t("statistics:empty.title")
              : t("statistics:offlineEmpty.title", "You're offline")}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isOnline
              ? t("statistics:empty.desc")
              : t(
                  "statistics:offlineEmpty.desc",
                  "No local stats data available. Reconnect to load your history.",
                )}
          </Text>
          {isOnline ? (
            <Button
              label={t("statistics:empty.cta")}
              onPress={() => navigation.navigate("MealAddMethod")}
              style={styles.emptyCta}
            />
          ) : null}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <ProgressAveragesCard
            avgKcal={state.avgKcal}
            caloriesSeries={state.kcalSeries}
            dailyGoal={userData?.calorieTarget ?? null}
            days={state.days}
            totalKcal={state.totalKcal}
          />

          <MetricsGrid
            values={{
              kcal: state.avgKcal,
              protein: state.avgProtein,
              carbs: state.avgCarbs,
              fat: state.avgFat,
            }}
            selected={state.metric}
            onSelect={state.setMetric}
          />

          {state.showLineSection && (
            <LineSection
              labels={state.labels}
              data={state.selectedSeries}
              metric={state.metric}
            />
          )}

          {state.hasTotals && (
            <MacroPieCard
              protein={state.totals.protein ?? 0}
              carbs={state.totals.carbs ?? 0}
              fat={state.totals.fat ?? 0}
            />
          )}
        </ScrollView>
      )}
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingBottom: 48,
    },
    header: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    customRange: { marginTop: theme.spacing.sm },
    banner: {
      margin: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderRadius: theme.rounded.sm,
      backgroundColor: theme.overlay,
      borderColor: theme.primary,
    },
    bannerTitle: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
    },
    bannerText: { color: theme.textSecondary, marginTop: theme.spacing.xs },
    bannerCta: { marginTop: theme.spacing.sm, alignSelf: "flex-start" },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: { color: theme.textSecondary, marginTop: theme.spacing.sm },
    emptyBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.bodyM,
      textAlign: "center",
      color: theme.text,
    },
    emptySubtitle: {
      color: theme.textSecondary,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
    emptyCta: { marginTop: theme.spacing.md, alignSelf: "stretch" },
    scroll: {
      gap: theme.spacing.md,
      paddingBottom: 28,
    },
  });

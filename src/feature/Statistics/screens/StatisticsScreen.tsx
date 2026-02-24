import { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@contexts/UserContext";
import { useNetInfo } from "@react-native-community/netinfo";
import { RangeTabs } from "../components/RangeTabs";
import { MetricsGrid } from "../components/MetricsGrid";
import { LineSection } from "../components/LineSection";
import { MacroPieCard } from "../components/MacroPieCard";
import { ProgressAveragesCard } from "../components/ProgressAveragesCard";
import { DateInput, Layout } from "@/components";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useTranslation } from "react-i18next";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { FREE_WINDOW_DAYS } from "@/services/mealService";
import type { ParamListBase } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import OfflineBanner from "@/components/OfflineBanner";
import {
  useStatisticsState,
  type RangeKey,
} from "@/feature/Statistics/hooks/useStatisticsState";

type StatisticsNavigation = StackNavigationProp<ParamListBase>;
type Props = {
  navigation: StatisticsNavigation;
};

export default function StatisticsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const net = useNetInfo();
  const { t } = useTranslation(["statistics", "common"]);
  const { userData } = useUserContext();

  const uid = userData?.uid || "";
  const sub = useSubscriptionData(uid);
  const isPremium = sub?.state === "premium_active";
  const accessWindowDays = isPremium ? undefined : FREE_WINDOW_DAYS;

  const state = useStatisticsState({
    uid,
    calorieTarget: userData?.calorieTarget ?? null,
    accessWindowDays,
  });

  return (
    <Layout>
      {!net.isConnected && <OfflineBanner />}

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

      {!isPremium && accessWindowDays && state.isWindowLimited && (
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
          <PrimaryButton
            label={t("statistics:upgrade", "Odblokuj Premium")}
            onPress={() => navigation.navigate("Paywall")}
            style={styles.bannerCta}
          />
        </View>
      )}

      {state.loadingMeals ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.accent} />
          <Text style={styles.loadingText}>
            {t("common:loading")}
          </Text>
        </View>
      ) : state.empty ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>
            {t("statistics:empty.title")}
          </Text>
          <Text style={styles.emptySubtitle}>
            {t("statistics:empty.desc")}
          </Text>
          <PrimaryButton
            label={t("statistics:empty.cta")}
            onPress={() => navigation.navigate("MealAddMethod")}
            style={styles.emptyCta}
          />
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
      borderColor: theme.accentSecondary,
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
      fontSize: theme.typography.size.md,
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

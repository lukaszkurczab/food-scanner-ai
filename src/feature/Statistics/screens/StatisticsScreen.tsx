import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@contexts/UserContext";
import { useNetInfo } from "@react-native-community/netinfo";
import { useStats } from "@/hooks/useStats";
import { lastNDaysRange } from "../utils/dateRange";
import { RangeTabs } from "../components/RangeTabs";
import { MetricsGrid, type MetricKey } from "../components/MetricsGrid";
import { LineSection } from "../components/LineSection";
import { MacroPieCard } from "../components/MacroPieCard";
import { ProgressAveragesCard } from "../components/ProgressAveragesCard";
import { BottomTabBar, DateInput, UserIcon } from "@/components";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getLastNDaysAggregated } from "@/utils/getLastNDaysAggregated";
import { useTranslation } from "react-i18next";
import { useMeals } from "@hooks/useMeals";
import type { Meal } from "@/types/meal";

type RangeKey = "7d" | "30d" | "custom";

export default function StatisticsScreen({ navigation }: any) {
  const theme = useTheme();
  const net = useNetInfo();
  const { t } = useTranslation(["statistics", "common"]);
  const { userData } = useUserContext();

  const uid = userData?.uid || "";
  const {
    meals: rawMeals,
    getMeals,
    loadingMeals,
  } = (useMeals(uid) as any) ?? {};
  const meals: Meal[] = Array.isArray(rawMeals) ? rawMeals : [];

  const [active, setActive] = useState<RangeKey>("7d");
  const [customRange, setCustomRange] = useState({
    start: new Date(),
    end: new Date(),
  });
  const [metric, setMetric] = useState<MetricKey>("kcal");

  useEffect(() => {
    if (!uid) return;
    if (typeof getMeals === "function") getMeals();
  }, [uid, getMeals]);

  const range = useMemo(() => {
    if (active === "7d") return lastNDaysRange(7);
    if (active === "30d") return lastNDaysRange(30);
    return customRange;
  }, [active, customRange]);

  const stats = useStats(meals, range, userData?.calorieTarget ?? null);

  const days = Math.max(
    1,
    Math.round((+range.end - +range.start) / (24 * 60 * 60 * 1000))
  );

  const { labels, data: nutrientsByDay } = getLastNDaysAggregated(
    meals,
    days,
    "nutrients"
  );

  const kcalSeries = stats.caloriesSeries ?? [];
  const proteinSeries = (nutrientsByDay ?? []).map((n) => n.protein ?? 0);
  const carbsSeries = (nutrientsByDay ?? []).map((n) => n.carbs ?? 0);
  const fatSeries = (nutrientsByDay ?? []).map((n) => n.fat ?? 0);

  const seriesByMetric: Record<MetricKey, number[]> = {
    kcal: kcalSeries,
    protein: proteinSeries,
    carbs: carbsSeries,
    fat: fatSeries,
  };

  const sumKcal = kcalSeries.reduce((s, v) => s + (v || 0), 0);

  const totals = stats.totals ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  const hasAnySeriesData =
    kcalSeries.some((v) => v > 0) ||
    proteinSeries.some((v) => v > 0) ||
    carbsSeries.some((v) => v > 0) ||
    fatSeries.some((v) => v > 0);

  const hasTotals =
    (totals.kcal ?? 0) > 0 ||
    (totals.protein ?? 0) > 0 ||
    (totals.carbs ?? 0) > 0 ||
    (totals.fat ?? 0) > 0;

  const empty =
    !loadingMeals && meals.length === 0 && !hasAnySeriesData && !hasTotals;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {!net.isConnected && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: theme.warning.background,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={{ color: theme.warning.text }}>
            {t("statistics:offline")}
          </Text>
        </View>
      )}

      <View
        style={[styles.header, { paddingHorizontal: theme.spacing.container }]}
      >
        <RangeTabs
          options={[
            { key: "7d", label: t("statistics:ranges.7d") },
            { key: "30d", label: t("statistics:ranges.30d") },
            { key: "custom", label: t("statistics:ranges.custom") },
          ]}
          active={active}
          onChange={(key) => setActive(key as RangeKey)}
        />
        {active === "custom" && (
          <View style={{ marginTop: 8 }}>
            <DateInput range={customRange} onChange={setCustomRange} />
          </View>
        )}
      </View>

      {loadingMeals ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.accent} />
          <Text style={{ color: theme.textSecondary, marginTop: 8 }}>
            {t("common:loading")}
          </Text>
        </View>
      ) : empty ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t("statistics:empty.title")}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              marginTop: 6,
              textAlign: "center",
            }}
          >
            {t("statistics:empty.desc")}
          </Text>

          <PrimaryButton
            label={t("statistics:empty.cta")}
            onPress={() => navigation.navigate("MealAddMethod")}
            style={{ marginTop: 14, alignSelf: "stretch" }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingHorizontal: theme.spacing.container, paddingBottom: 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ProgressAveragesCard
            caloriesSeries={kcalSeries}
            dailyGoal={userData?.calorieTarget ?? null}
            days={days}
            totalKcal={sumKcal}
          />

          <MetricsGrid
            values={{
              kcal: sumKcal,
              protein: totals.protein ?? 0,
              carbs: totals.carbs ?? 0,
              fat: totals.fat ?? 0,
            }}
            selected={metric}
            onSelect={setMetric}
          />

          <LineSection
            labels={labels}
            data={seriesByMetric[metric]}
            metric={metric}
          />

          <MacroPieCard
            protein={totals.protein ?? 0}
            carbs={totals.carbs ?? 0}
            fat={totals.fat ?? 0}
          />
        </ScrollView>
      )}

      <BottomTabBar
        tabs={[
          {
            key: "Home",
            icon: "home-filled",
            onPress: () => navigation.navigate("Home"),
          },
          {
            key: "Stats",
            icon: "bar-chart",
            onPress: () => navigation.navigate("Statistics"),
          },
          {
            key: "Add",
            icon: "add",
            isFab: true,
            onPress: () => navigation.navigate("MealAddMethod"),
          },
          {
            key: "History",
            icon: "history",
            onPress: () => navigation.navigate("HistoryList"),
          },
          {
            key: "Profile",
            icon: "person",
            onPress: () => navigation.navigate("Profile"),
          },
        ]}
        renderProfileIcon={
          <UserIcon size={32} accessibilityLabel="Profile picture" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingBottom: 80 },
  header: { paddingTop: 12, paddingBottom: 8 },
  banner: { margin: 12, padding: 10, borderRadius: 10, borderWidth: 1 },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { gap: 16 },
});

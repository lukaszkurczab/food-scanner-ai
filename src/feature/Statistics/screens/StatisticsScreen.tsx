import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { getLastNDaysAggregated } from "@/utils/getLastNDaysAggregated";
import { useTranslation } from "react-i18next";

type RangeKey = "7d" | "30d" | "custom";

export default function StatisticsScreen({ navigation }: any) {
  const theme = useTheme();
  const net = useNetInfo();
  const { t } = useTranslation(["statistics", "common"]);
  const { meals, loadingMeals, userData } = useUserContext() as any;

  const [active, setActive] = useState<RangeKey>("7d");
  const [customRange, setCustomRange] = useState({
    start: new Date(),
    end: new Date(),
  });
  const [metric, setMetric] = useState<MetricKey>("kcal");

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
  const kcalSeries = stats.caloriesSeries;
  const proteinSeries = nutrientsByDay.map((n) => n.protein);
  const carbsSeries = nutrientsByDay.map((n) => n.carbs);
  const fatSeries = nutrientsByDay.map((n) => n.fat);

  const seriesByMetric: Record<MetricKey, number[]> = {
    kcal: kcalSeries,
    protein: proteinSeries,
    carbs: carbsSeries,
    fat: fatSeries,
  };

  const sumKcal = kcalSeries.reduce((s, v) => s + v, 0);

  const totals = stats.totals;
  const empty = !loadingMeals && sumKcal === 0 && totals.kcal === 0;

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
          onChange={(key) => {
            setActive(key as any);
          }}
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
          <Pressable
            onPress={() => navigation.navigate("MealAddMethod")}
            style={[
              styles.cta,
              { backgroundColor: theme.accent, borderRadius: theme.rounded.md },
            ]}
          >
            <Text style={{ color: theme.onAccent, fontWeight: "600" }}>
              {t("statistics:empty.cta")}
            </Text>
          </Pressable>
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
              protein: totals.protein,
              carbs: totals.carbs,
              fat: totals.fat,
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
            protein={totals.protein}
            carbs={totals.carbs}
            fat={totals.fat}
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
  cta: { marginTop: 14, paddingVertical: 10, paddingHorizontal: 18 },
  scroll: { gap: 16 },
});

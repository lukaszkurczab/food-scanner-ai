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
import { useTranslation } from "react-i18next";
import { useMeals } from "@hooks/useMeals";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { FREE_WINDOW_DAYS } from "@/services/mealService";
import type { Meal } from "@/types/meal";
import OfflineBanner from "@/components/OfflineBanner";

type RangeKey = "7d" | "30d" | "custom";

export default function StatisticsScreen({ navigation }: any) {
  const theme = useTheme();
  const net = useNetInfo();
  const { t } = useTranslation(["statistics", "common"]);
  const { userData } = useUserContext();

  const uid = userData?.uid || "";
  const sub = useSubscriptionData(uid);
  const isPremium = sub?.state === "premium_active";
  const accessWindowDays = isPremium ? undefined : FREE_WINDOW_DAYS;

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

  const baseRange = useMemo(() => {
    if (active === "7d") return lastNDaysRange(7);
    if (active === "30d") return lastNDaysRange(30);
    return customRange;
  }, [active, customRange]);

  const effectiveRange = useMemo(() => {
    if (!accessWindowDays) return baseRange;
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - accessWindowDays + 1);
    cutoff.setHours(0, 0, 0, 0);
    const start = baseRange.start < cutoff ? cutoff : baseRange.start;
    const end = baseRange.end < cutoff ? cutoff : baseRange.end;
    return { start, end } as const;
  }, [baseRange, accessWindowDays]);

  const effectiveRangeForStats = useMemo(() => {
    const start = new Date(effectiveRange.start);
    const end = new Date(effectiveRange.end);
    end.setHours(23, 59, 59, 999);
    return { start, end } as const;
  }, [effectiveRange]);

  const stats = useStats(
    meals,
    effectiveRangeForStats,
    userData?.calorieTarget ?? null
  );

  const days = Math.max(
    1,
    Math.round(
      (+effectiveRange.end - +effectiveRange.start) / (24 * 60 * 60 * 1000)
    ) + 1
  );

  const showLineSection = active !== "custom" || days >= 2;

  const { labels, nutrientsByDay } = useMemo(() => {
    const DAY = 24 * 60 * 60 * 1000;
    const start = new Date(effectiveRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(effectiveRange.end);
    end.setHours(0, 0, 0, 0);
    const bucketCount = Math.max(1, Math.round((+end - +start) / DAY) + 1);
    const labels: string[] = [];
    const buckets = Array.from({ length: bucketCount }, () => ({
      protein: 0,
      carbs: 0,
      fat: 0,
    }));
    const fmt = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${dd}.${mm}`;
    };
    for (let i = 0; i < bucketCount; i++) {
      const d = new Date(+start + i * DAY);
      labels.push(fmt(d));
    }
    const endInclusive = new Date(+end + DAY - 1);
    const inRangeMeals = meals.filter((m: any) => {
      const ts = new Date(m.timestamp || m.updatedAt || m.createdAt);
      return ts >= start && ts <= endInclusive;
    });
    for (const m of inRangeMeals) {
      const ts = new Date(
        (m as any).timestamp || (m as any).updatedAt || (m as any).createdAt
      );
      ts.setHours(0, 0, 0, 0);
      const idx = Math.floor((+ts - +start) / DAY);
      if (idx >= 0 && idx < bucketCount) {
        const ings = (m as any).ingredients || [];
        if (ings.length) {
          for (const ing of ings) {
            buckets[idx].protein += Number(ing?.protein) || 0;
            buckets[idx].carbs += Number(ing?.carbs) || 0;
            buckets[idx].fat += Number(ing?.fat) || 0;
          }
        } else if ((m as any).totals) {
          buckets[idx].protein += Number((m as any).totals.protein) || 0;
          buckets[idx].carbs += Number((m as any).totals.carbs) || 0;
          buckets[idx].fat += Number((m as any).totals.fat) || 0;
        }
      }
    }
    return { labels, nutrientsByDay: buckets } as const;
  }, [meals, effectiveRange]);

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
      {!net.isConnected && <OfflineBanner />}

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
            <DateInput
              range={customRange}
              onChange={setCustomRange}
              allowSingleDay
            />
          </View>
        )}
      </View>

      {!isPremium &&
        accessWindowDays &&
        baseRange.start < effectiveRange.start && (
          <View
            style={[
              styles.banner,
              {
                backgroundColor: theme.overlay,
                borderColor: theme.accentSecondary,
              },
            ]}
          >
            <Text style={{ color: theme.text, fontWeight: "700" }}>
              {t(
                "statistics:limitedWindowTitle",
                "Dostęp do starszych danych wymaga Premium"
              )}
            </Text>
            <Text style={{ color: theme.textSecondary, marginTop: 4 }}>
              {t("statistics:limitedWindowDesc", {
                defaultValue: "Zakres został skrócony do ostatnich {{d}} dni.",
                d: accessWindowDays,
              })}
            </Text>
            <PrimaryButton
              label={t("statistics:upgrade", "Odblokuj Premium")}
              onPress={() => navigation.navigate("Paywall")}
              style={{ marginTop: 8, alignSelf: "flex-start" }}
            />
          </View>
        )}

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

          {showLineSection && (
            <LineSection
              labels={labels}
              data={seriesByMetric[metric]}
              metric={metric}
            />
          )}

          {hasTotals && (
            <MacroPieCard
              protein={totals.protein ?? 0}
              carbs={totals.carbs ?? 0}
              fat={totals.fat ?? 0}
            />
          )}
        </ScrollView>
      )}

      <BottomTabBar
        renderProfileIcon={
          <UserIcon size={32} accessibilityLabel="Profile picture" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 8 },
  banner: {
    margin: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: { fontWeight: "700", fontSize: 18, textAlign: "center" },
  scroll: {},
});

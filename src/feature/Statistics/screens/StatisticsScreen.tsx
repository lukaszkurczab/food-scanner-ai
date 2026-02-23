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
          <View style={{ marginTop: 8 }}>
            <DateInput
              range={state.customRange}
              onChange={state.setCustomRange}
              allowSingleDay
            />
          </View>
        )}
      </View>

      {!isPremium && accessWindowDays && state.isWindowLimited && (
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
              "Dostęp do starszych danych wymaga Premium",
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

      {state.loadingMeals ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.accent} />
          <Text style={{ color: theme.textSecondary, marginTop: 8 }}>
            {t("common:loading")}
          </Text>
        </View>
      ) : state.empty ? (
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
          contentContainerStyle={[styles.scroll, { paddingBottom: 28 }]}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingBottom: 48,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 8,
  },
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
    gap: 8,
  },
  emptyTitle: { fontWeight: "700", fontSize: 18, textAlign: "center" },
  scroll: {
    gap: 16,
  },
});

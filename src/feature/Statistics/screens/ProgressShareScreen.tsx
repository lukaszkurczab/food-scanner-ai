import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useNavigation } from "@react-navigation/native";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { ShareCanvas } from "@/components";
import { Layout, PrimaryButton, SecondaryButton } from "@/components";
import {
  ShareOptions,
  defaultShareOptions,
  type DataSeries,
} from "@/types/share";
import { useMeals } from "@/hooks/useMeals";
import { useUserContext } from "@/context/UserContext";

type RangeKey = "day" | "week" | "month";
type MetricKey = "kcal" | "protein" | "carbs" | "fat";

const DAY_MS = 24 * 60 * 60 * 1000;

function lastNDaysRange(n: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end.getTime() - (n - 1) * DAY_MS);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export default function ProgressShareScreen() {
  const theme = useTheme();
  const nav = useNavigation<any>();
  const { userData } = useUserContext();
  const uid = userData?.uid || "";
  const { meals = [], getMeals } = (useMeals(uid) as any) ?? {};

  useEffect(() => {
    if (typeof getMeals === "function") getMeals();
  }, [getMeals]);

  const [rangeKey, setRangeKey] = useState<RangeKey>("week");
  const [chartType, setChartType] =
    useState<NonNullable<ShareOptions["chartType"]>>("line");
  const [selected, setSelected] = useState<Record<MetricKey, boolean>>({
    kcal: true,
    protein: false,
    carbs: false,
    fat: false,
  });

  const [opts, setOpts] = useState<ShareOptions>({
    ...defaultShareOptions,
    chartType: "line",
    macroLayout: "pie",
    showTitle: true,
    showKcal: false,
    showPie: true, // domyślnie pokaż koło gdy chartType=pie
  });

  const shotRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(true);

  const days = rangeKey === "day" ? 1 : rangeKey === "week" ? 7 : 30;
  const range = lastNDaysRange(days);

  // Zbuduj etykiety dzienne
  const labels = useMemo(() => {
    const out: string[] = [];
    const start = new Date(range.start);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * DAY_MS);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      out.push(`${dd}.${mm}`);
    }
    return out;
  }, [range.start.getTime(), days]);

  // Zbierz posiłki w zakresie
  const inRangeMeals = useMemo(() => {
    const startMs = new Date(range.start).setHours(0, 0, 0, 0);
    const endMs = new Date(range.end).setHours(23, 59, 59, 999);
    const toMillis = (raw: unknown): number => {
      if (typeof raw === "number") return raw < 1e12 ? raw * 1000 : raw;
      const t = Date.parse(String(raw ?? ""));
      return Number.isNaN(t) ? NaN : t;
    };
    return (meals as any[]).filter((m) => {
      const raw = m.timestamp ?? m.updatedAt ?? m.createdAt;
      const t = toMillis(raw);
      return !Number.isNaN(t) && t >= startMs && t <= endMs;
    });
  }, [meals, range.start, range.end]);

  // Zsumuj dziennie makro i kcal
  const bucketed = useMemo(() => {
    const start = new Date(range.start);
    start.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: days }, () => ({
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }));
    for (const m of inRangeMeals) {
      const ts = new Date(m.timestamp ?? m.updatedAt ?? m.createdAt);
      ts.setHours(0, 0, 0, 0);
      const idx = Math.floor((+ts - +start) / DAY_MS);
      if (idx >= 0 && idx < days) {
        const ings = (m as any).ingredients || [];
        if (Array.isArray(ings) && ings.length) {
          for (const ing of ings) {
            buckets[idx].protein += Number(ing?.protein) || 0;
            buckets[idx].carbs += Number(ing?.carbs) || 0;
            buckets[idx].fat += Number(ing?.fat) || 0;
            buckets[idx].kcal += Number(ing?.kcal) || 0;
          }
        } else if ((m as any).totals) {
          const t = (m as any).totals;
          buckets[idx].protein += Number(t.protein) || 0;
          buckets[idx].carbs += Number(t.carbs) || 0;
          buckets[idx].fat += Number(t.fat) || 0;
          buckets[idx].kcal += Number(t.kcal) || 0;
        }
      }
    }
    return buckets;
  }, [inRangeMeals, range.start, days]);

  // Seria danych dla ShareCanvas (bar/line)
  const dataSeries: DataSeries[] = useMemo(() => {
    const add = (key: MetricKey, label: string) =>
      bucketed.map((b) => b[key] ?? 0);
    const out: DataSeries[] = [];
    if (selected.kcal) out.push({ label: "kcal", values: add("kcal", "kcal") });
    if (selected.protein)
      out.push({ label: "protein", values: add("protein", "protein") });
    if (selected.carbs)
      out.push({ label: "carbs", values: add("carbs", "carbs") });
    if (selected.fat) out.push({ label: "fat", values: add("fat", "fat") });
    // Gdy nic nie wybrano dla bar/line, domyślnie kcal
    if (!out.length && chartType !== "pie") {
      out.push({ label: "kcal", values: add("kcal", "kcal") });
    }
    return out.map((s) => ({
      label: s.label,
      values: s.values.slice(0, labels.length),
    }));
  }, [bucketed, selected, labels.length, chartType]);

  // Sumy do pie/overlay
  const totals = useMemo(() => {
    return bucketed.reduce(
      (acc, b) => ({
        kcal: acc.kcal + b.kcal,
        protein: acc.protein + b.protein,
        carbs: acc.carbs + b.carbs,
        fat: acc.fat + b.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [bucketed]);

  // Tytuł kadru
  const title = useMemo(() => {
    const map: Record<RangeKey, string> = {
      day: "Postępy — 1 dzień",
      week: "Postępy — 7 dni",
      month: "Postępy — 30 dni",
    };
    return map[rangeKey];
  }, [rangeKey]);

  // Aktualizuj opcje kanwy gdy zmienia się typ wykresu/serie
  useEffect(() => {
    setOpts((prev) => ({
      ...prev,
      chartType,
      showPie: chartType === "pie",
      dataSeries: chartType === "pie" ? [] : dataSeries,
      barOrientation: prev.barOrientation ?? "vertical",
      // dla czytelności – pie pokazujemy w layoucie "pie", overlay można włączyć z menu ShareCanvas
      macroLayout: prev.macroLayout ?? "pie",
    }));
  }, [chartType, dataSeries]);

  const wait = (ms = 0) => new Promise((res) => setTimeout(res, ms));
  const share = async () => {
    if (!shotRef.current) return;
    setMenuVisible(false);
    await wait(50);
    const uri = await captureRef(shotRef, {
      format: "png",
      quality: 1,
      width: 1080,
      height: 1920,
      result: "tmpfile",
    });
    setMenuVisible(true);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  };

  const toggleMetric = (key: MetricKey) =>
    setSelected((s) => ({ ...s, [key]: !s[key] }));

  return (
    <Layout showNavigation={false} disableScroll>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        {/* Sterowanie */}
        <View style={styles.row}>
          {(["day", "week", "month"] as const).map((rk) => (
            <Pill
              key={rk}
              label={
                rk === "day" ? "Dzień" : rk === "week" ? "Tydzień" : "Miesiąc"
              }
              active={rangeKey === rk}
              onPress={() => setRangeKey(rk)}
            />
          ))}
        </View>

        <View style={styles.row}>
          {(["pie", "bar", "line"] as const).map((ct) => (
            <Pill
              key={ct}
              label={ct === "pie" ? "Pie" : ct === "bar" ? "Bar" : "Line"}
              active={chartType === ct}
              onPress={() => setChartType(ct)}
            />
          ))}
        </View>

        {chartType !== "pie" && (
          <View style={styles.rowWrap}>
            {(["kcal", "protein", "carbs", "fat"] as const).map((m) => (
              <Pill
                key={m}
                label={m}
                active={!!selected[m]}
                onPress={() => toggleMetric(m)}
              />
            ))}
          </View>
        )}

        {/* Podgląd do udostępnienia */}
        <View style={styles.center}>
          <ViewShot ref={shotRef}>
            <ShareCanvas
              width={360}
              height={640}
              photoUri={null}
              title={title}
              kcal={Math.round(totals.kcal)}
              protein={Math.round(totals.protein)}
              fat={Math.round(totals.fat)}
              carbs={Math.round(totals.carbs)}
              options={opts}
              onChange={setOpts}
              menuVisible={menuVisible}
            />
          </ViewShot>
        </View>

        <PrimaryButton label="Udostępnij" onPress={share} />
        <SecondaryButton label="Wróć" onPress={() => nav.goBack()} />
      </ScrollView>
    </Layout>
  );
}

/* --- UI pomocnicze --- */
function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Text
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? theme.overlay : theme.card,
          borderColor: active ? theme.accentSecondary : theme.border,
          color: theme.text,
        },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  row: { flexDirection: "row", gap: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
});

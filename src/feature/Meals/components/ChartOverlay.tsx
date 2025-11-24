import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { ChartVariant } from "@/types/share";

import MacroPieChart from "./chartLayouts/MacroPieChart";
import DonutMacroChart from "./chartLayouts/DonutMacroChart";
import MacroBarMini from "./chartLayouts/MacroBarMini";
import MacroPolarAreaChart from "./chartLayouts/MacroPolarAreaChart";
import MacroRadarChart from "./chartLayouts/MacroRadarChart";
import GaugeMacroChart from "./chartLayouts/GaugeMacroChart";

type Palette = {
  macro: {
    protein: string;
    carbs: string;
    fat: string;
  };
  accent: string;
  accentSecondary: string;
  text: string;
};

type Props = {
  variant: ChartVariant;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  palette: Palette;
  showKcalLabel?: boolean;
  showLegend?: boolean;
  barColor?: string | null;
  lineColor?: string | null;
  textColor?: string | null;
  fontFamily?: string | null;
  fontWeight?: "300" | "500" | "700" | null;
  macroColors?: {
    protein?: string;
    carbs?: string;
    fat?: string;
  } | null;
  backgroundColor?: string | null;
};

type PieDatum = { value: number; color: string; label: string };

export default function ChartOverlay({
  variant,
  protein,
  fat,
  carbs,
  kcal,
  palette,
  showKcalLabel = true,
  showLegend = true,
  barColor,
  textColor,
  fontFamily,
  fontWeight,
  macroColors,
  backgroundColor,
}: Props) {
  const { t } = useTranslation(["meals"]);

  const proteinColor = macroColors?.protein ?? palette.macro.protein;
  const fatColor = macroColors?.fat ?? palette.macro.fat;
  const carbsColor = macroColors?.carbs ?? palette.macro.carbs;

  const pieData: PieDatum[] = useMemo(
    () => [
      {
        value: Math.max(0, protein),
        color: proteinColor,
        label: t("protein"),
      },
      { value: Math.max(0, fat), color: fatColor, label: t("fat") },
      {
        value: Math.max(0, carbs),
        color: carbsColor,
        label: t("carbs"),
      },
    ],
    [protein, fat, carbs, proteinColor, fatColor, carbsColor, t]
  );

  const sharedTextColor = textColor || palette.text;
  const sharedFontFamily = fontFamily || undefined;
  const sharedFontWeight = fontWeight || "700";
  const chartBg = backgroundColor || "transparent";

  const commonTextProps = {
    textColor: sharedTextColor,
    fontFamily: sharedFontFamily,
    fontWeight: sharedFontWeight,
    backgroundColor: chartBg,
  };

  const content = (() => {
    switch (variant) {
      case "macroDonut":
        return (
          <DonutMacroChart
            data={pieData}
            kcal={kcal}
            showKcalLabel={showKcalLabel}
            showLegend={showLegend}
            {...commonTextProps}
          />
        );
      case "macroBarMini":
        return (
          <MacroBarMini
            protein={protein}
            fat={fat}
            carbs={carbs}
            kcal={kcal}
            showKcalLabel={showKcalLabel}
            {...commonTextProps}
          />
        );
      case "macroPolarArea":
        return (
          <MacroPolarAreaChart
            data={pieData}
            kcal={kcal}
            showKcalLabel={showKcalLabel}
            showLegend={showLegend}
            {...commonTextProps}
          />
        );
      case "macroRadar":
        return (
          <MacroRadarChart
            data={pieData}
            kcal={kcal}
            showKcalLabel={showKcalLabel}
            {...commonTextProps}
          />
        );
      case "macroGauge":
        return (
          <GaugeMacroChart
            data={pieData}
            kcal={kcal}
            showLabel={showKcalLabel}
            {...commonTextProps}
          />
        );
      case "macroPieWithLegend":
      default:
        return (
          <MacroPieChart
            data={pieData}
            kcal={kcal}
            showKcalLabel={showKcalLabel}
            showLegend={showLegend}
            {...commonTextProps}
          />
        );
    }
  })();

  return (
    <View style={[styles.card, { backgroundColor: chartBg }]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: "hidden",
  },
});

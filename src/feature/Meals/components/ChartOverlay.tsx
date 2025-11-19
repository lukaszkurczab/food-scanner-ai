import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ChartVariant } from "@/types/share";

import MacroPieWithLegend from "./chartLayouts/MacroPieWithLegend";
import DonutMacroChart from "./chartLayouts/DonutMacroChart";
import MacroBarMini from "./chartLayouts/MacroBarMini";
import MacroPolarAreaChart from "./chartLayouts/MacroPolarAreaChart";
import MacroRadarChart from "./chartLayouts/MacroRadarChart";

type Palette = {
  macro: {
    protein: string;
    carbs: string;
    fat: string;
  };
  accent: string;
  accentSecondary: string;
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
};

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
}: Props) {
  const { t } = useTranslation(["meals"]);

  const pieData = useMemo(
    () => [
      {
        value: Math.max(0, protein),
        color: palette.macro.protein,
        label: t("protein"),
      },
      { value: Math.max(0, fat), color: palette.macro.fat, label: t("fat") },
      {
        value: Math.max(0, carbs),
        color: palette.macro.carbs,
        label: t("carbs"),
      },
    ],
    [protein, fat, carbs, palette, t]
  );

  if (variant === "macroDonut") {
    return (
      <DonutMacroChart
        data={pieData}
        kcal={kcal}
        showKcalLabel={showKcalLabel}
        showLegend={showLegend}
      />
    );
  }

  if (variant === "macroBarMini") {
    return (
      <MacroBarMini
        protein={protein}
        fat={fat}
        carbs={carbs}
        kcal={kcal}
        barColor={barColor || palette.accentSecondary}
        showKcalLabel={showKcalLabel}
      />
    );
  }

  if (variant === "macroPolarArea") {
    return (
      <MacroPolarAreaChart
        data={pieData}
        kcal={kcal}
        showKcalLabel={showKcalLabel}
        showLegend={showLegend}
      />
    );
  }

  if (variant === "macroRadar") {
    return (
      <MacroRadarChart
        data={pieData}
        kcal={kcal}
        showKcalLabel={showKcalLabel}
      />
    );
  }

  return (
    <MacroPieWithLegend
      data={pieData}
      kcal={kcal}
      showKcalLabel={showKcalLabel}
      showLegend={showLegend}
    />
  );
}

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ChartVariant } from "@/types/share";

import MacroPieWithLegend from "./chartLayouts/MacroPieWithLegend";
import MacroLineMini from "./chartLayouts/MacroLineMini";
import MacroBarMini from "./chartLayouts/MacroBarMini";

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
};

export default function ChartOverlay({
  variant,
  protein,
  fat,
  carbs,
  kcal,
  palette,
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

  if (variant === "macroLineMini") {
    return (
      <MacroLineMini
        protein={protein}
        fat={fat}
        carbs={carbs}
        kcal={kcal}
        accent={palette.accent}
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
        accentSecondary={palette.accentSecondary}
      />
    );
  }

  return <MacroPieWithLegend data={pieData} kcal={kcal} />;
}

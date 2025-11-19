import React from "react";
import { useTheme } from "@/theme/useTheme";
import type { CardVariant } from "@/types/share";

import MacroSummaryCard from "./cardLayouts/MacroSummaryCard";
import MacroVerticalStackCard from "./cardLayouts/MacroVerticalStackCard";
import MacroBadgeCard from "./cardLayouts/MacroBadgeCard";
import MacroSplitCard from "./cardLayouts/MacroSplitCard";
import MacroTagStripCard from "./cardLayouts/MacroTagStripCard";

type Props = {
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  color?: string;
  backgroundColor?: string;
  variant?: CardVariant;
  showKcal?: boolean;
  showMacros?: boolean;
};

type MacroColors = {
  protein: string;
  carbs: string;
  fat: string;
};

export type MacroCardProps = {
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  textColor: string;
  bgColor: string;
  macroColors: MacroColors;
  showKcal: boolean;
  showMacros: boolean;
};

export default function CardOverlay({
  protein,
  fat,
  carbs,
  kcal,
  color,
  backgroundColor,
  variant = "macroSummaryCard",
  showKcal = true,
  showMacros = true,
}: Props) {
  const theme = useTheme();
  const textColor = color || String(theme.text);
  const bg = backgroundColor || "rgba(0,0,0,0.35)";

  const macroColors: MacroColors = {
    protein: String(theme.macro.protein),
    carbs: String(theme.macro.carbs),
    fat: String(theme.macro.fat),
  };

  const baseProps: MacroCardProps = {
    protein,
    fat,
    carbs,
    kcal,
    textColor,
    bgColor: bg,
    macroColors,
    showKcal,
    showMacros,
  };

  switch (variant) {
    case "macroVerticalStackCard":
      return <MacroVerticalStackCard {...baseProps} />;
    case "macroBadgeCard":
      return <MacroBadgeCard {...baseProps} />;
    case "macroSplitCard":
      return <MacroSplitCard {...baseProps} />;
    case "macroTagStripCard":
      return <MacroTagStripCard {...baseProps} />;
    case "macroSummaryCard":
    default:
      return <MacroSummaryCard {...baseProps} />;
  }
}

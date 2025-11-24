// feature/Meals/share/components/CardOverlay.tsx
import React from "react";
import { useTheme } from "@/theme/useTheme";
import type { CardVariant } from "@/types/share";

import MacroSummaryCard from "./cardLayouts/MacroSummaryCard";
import MacroVerticalStackCard from "./cardLayouts/MacroVerticalStackCard";
import MacroBadgeCard from "./cardLayouts/MacroBadgeCard";
import MacroSplitCard from "./cardLayouts/MacroSplitCard";
import MacroTagStripCard from "./cardLayouts/MacroTagStripCard";

type MacroColors = {
  protein: string;
  carbs: string;
  fat: string;
};

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
  macroColorsOverride?: Partial<MacroColors>;
  fontFamily?: string | null;
  fontWeight?: "300" | "500" | "700" | "normal" | "bold";
};

export type MacroCardProps = {
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  textColor: string;
  bgColor: string;
  macroColors: {
    protein: string;
    carbs: string;
    fat: string;
  };
  showKcal: boolean;
  showMacros: boolean;
  fontFamily?: string;
  fontWeight?: "300" | "500" | "700" | "normal" | "bold";
};

const DEFAULT_TEXT = "#000000";
const DEFAULT_PROTEIN = "#2196F3";
const DEFAULT_CARBS = "#81C784";
const DEFAULT_FAT = "#C6A025";

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
  macroColorsOverride,
  fontFamily,
  fontWeight,
}: Props) {
  const theme = useTheme();

  const textColor = color || DEFAULT_TEXT;
  const bg = backgroundColor || "rgba(0,0,0,0.35)";

  const macroColors: MacroColors = {
    protein:
      macroColorsOverride?.protein ||
      String(theme.macro?.protein ?? DEFAULT_PROTEIN),
    carbs:
      macroColorsOverride?.carbs || String(theme.macro?.carbs ?? DEFAULT_CARBS),
    fat: macroColorsOverride?.fat || String(theme.macro?.fat ?? DEFAULT_FAT),
  };

  const resolvedFontFamily = fontFamily ?? undefined;

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
    fontFamily: resolvedFontFamily,
    fontWeight,
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

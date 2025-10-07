import React, { useMemo } from "react";
import { View } from "react-native";
import { MacroChip } from "@/components/MacroChip";
import { useTheme } from "@/theme/useTheme";
import type { Meal, Nutrients } from "@/types/meal";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { useTranslation } from "react-i18next";

export const LiveMacroPreview: React.FC<{ meal: Meal }> = ({ meal }) => {
  const theme = useTheme();
  const { t } = useTranslation("meals");
  const totals: Nutrients = useMemo(
    () => calculateTotalNutrients([meal]),
    [meal]
  );
  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <MacroChip label={t("calories")} value={totals.kcal} />
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <MacroChip label={t("protein")} value={totals.protein} />
        <MacroChip label={t("carbs")} value={totals.carbs} />
        <MacroChip label={t("fat")} value={totals.fat} />
      </View>
    </View>
  );
};

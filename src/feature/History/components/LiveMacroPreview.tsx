import React, { useMemo } from "react";
import { View } from "react-native";
import { MacroChip } from "@/components/MacroChip";
import { useTheme } from "@/theme/useTheme";
import type { Meal, Nutrients } from "@/types/meal";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";

export const LiveMacroPreview: React.FC<{ meal: Meal }> = ({ meal }) => {
  const theme = useTheme();
  const totals: Nutrients = useMemo(
    () => calculateTotalNutrients([meal]),
    [meal]
  );
  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <MacroChip kind="kcal" value={totals.kcal} />
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <MacroChip kind="protein" value={totals.protein} />
        <MacroChip kind="carbs" value={totals.carbs} />
        <MacroChip kind="fat" value={totals.fat} />
      </View>
    </View>
  );
};

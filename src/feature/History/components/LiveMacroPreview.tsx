import React, { useMemo } from "react";
import { View } from "react-native";
import { MacroChip } from "@/src/components/MacroChip";
import { useTheme } from "@/src/theme/useTheme";
import type { Meal, Nutrients } from "@/src/types/meal";
import { calculateTotalNutrients } from "@/src/services";

export const LiveMacroPreview: React.FC<{ meal: Meal }> = ({ meal }) => {
  const theme = useTheme();
  const totals: Nutrients = useMemo(
    () => calculateTotalNutrients([meal]),
    [meal]
  );
  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <MacroChip label="Calories" value={totals.kcal} />
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <MacroChip label="Protein" value={totals.protein} />
        <MacroChip label="Carbs" value={totals.carbs} />
        <MacroChip label="Fat" value={totals.fat} />
      </View>
    </View>
  );
};

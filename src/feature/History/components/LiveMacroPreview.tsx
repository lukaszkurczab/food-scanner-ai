import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { MacroChip } from "@/components/MacroChip";
import { useTheme } from "@/theme/useTheme";
import type { Meal, Nutrients } from "@/types/meal";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";

export const LiveMacroPreview: React.FC<{ meal: Meal }> = ({ meal }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const totals: Nutrients = useMemo(
    () => calculateTotalNutrients([meal]),
    [meal]
  );
  return (
    <View style={styles.container}>
      <MacroChip kind="kcal" value={totals.kcal} />
      <View style={styles.row}>
        <MacroChip kind="protein" value={totals.protein} />
        <MacroChip kind="carbs" value={totals.carbs} />
        <MacroChip kind="fat" value={totals.fat} />
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { marginTop: theme.spacing.md },
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
  });

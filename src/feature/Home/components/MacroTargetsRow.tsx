import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MacroTargetDonut } from "./MacroTargetDonut";
import type { MacroTargets } from "@/utils/calculateMacroTargets";
import type { Nutrients } from "@/types/meal";
import { useTranslation } from "react-i18next";

type Props = {
  macroTargets: MacroTargets;
  consumed: Pick<Nutrients, "protein" | "fat" | "carbs">;
};

export function MacroTargetsRow({ macroTargets, consumed }: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["home", "common"]);

  const hasAnyTarget = useMemo(() => {
    return (
      (macroTargets.proteinGrams || 0) > 0 ||
      (macroTargets.fatGrams || 0) > 0 ||
      (macroTargets.carbsGrams || 0) > 0
    );
  }, [macroTargets]);

  if (!hasAnyTarget) {
    return null;
  }

  const proteinLabel = t("common:protein", "Protein");
  const fatLabel = t("common:fat", "Fat");
  const carbsLabel = t("common:carbs", "Carbs");

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <View style={[styles.row, { gap: theme.spacing.md }]}>
        <View style={styles.item}>
          <MacroTargetDonut
            macro="protein"
            targetGrams={macroTargets.proteinGrams}
            consumedGrams={consumed.protein}
          />
          <Text
            style={{
              marginTop: theme.spacing.xs,
              fontSize: theme.typography.size.sm,
              fontFamily: theme.typography.fontFamily.medium,
              color: theme.text,
              textAlign: "center",
            }}
          >
            {proteinLabel}
          </Text>
        </View>
        <View style={styles.item}>
          <MacroTargetDonut
            macro="fat"
            targetGrams={macroTargets.fatGrams}
            consumedGrams={consumed.fat}
          />
          <Text
            style={{
              marginTop: theme.spacing.xs,
              fontSize: theme.typography.size.sm,
              fontFamily: theme.typography.fontFamily.medium,
              color: theme.text,
              textAlign: "center",
            }}
          >
            {fatLabel}
          </Text>
        </View>
        <View style={styles.item}>
          <MacroTargetDonut
            macro="carbs"
            targetGrams={macroTargets.carbsGrams}
            consumedGrams={consumed.carbs}
          />
          <Text
            style={{
              marginTop: theme.spacing.xs,
              fontSize: theme.typography.size.sm,
              fontFamily: theme.typography.fontFamily.medium,
              color: theme.text,
              textAlign: "center",
            }}
          >
            {carbsLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  item: {
    flex: 1,
    alignItems: "center",
  },
});

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";

type MacroKind = "kcal" | "protein" | "carbs" | "fat";

type MacroChipProps = {
  kind: MacroKind;
  value: number;
  label?: string;
  unit?: string;
  style?: ViewStyle;
};

export const MacroChip: React.FC<MacroChipProps> = ({
  kind,
  value,
  label,
  unit,
  style,
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["meals"]);

  const colorMap: Record<MacroKind, string> = {
    kcal: theme.text,
    protein: theme.macro.protein,
    carbs: theme.macro.carbs,
    fat: theme.macro.fat,
  };

  const defaultLabelMap: Record<MacroKind, string> = {
    kcal: t("meals:calories"),
    protein: t("meals:protein"),
    carbs: t("meals:carbs"),
    fat: t("meals:fat"),
  };

  const defaultUnitMap: Record<MacroKind, string> = {
    kcal: "[kcal]",
    protein: "[g]",
    carbs: "[g]",
    fat: "[g]",
  };

  const c = colorMap[kind];
  const bg = String(kind === "kcal" ? theme.border : c) + "18";

  return (
    <View style={[styles.macroWrapper, style]}>
      <View style={styles.labelRow}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.macroLabel,
            {
              color: theme.text,
              fontSize: theme.typography.size.sm,
            },
          ]}
        >
          {label ?? defaultLabelMap[kind]}
        </Text>
        <Text
          style={{
            opacity: 0.7,
            color: theme.text,
            fontSize: theme.typography.size.sm,
            marginLeft: 6,
            flexShrink: 0,
          }}
        >
          {unit ?? defaultUnitMap[kind]}
        </Text>
      </View>

      <View
        style={[
          styles.macro,
          {
            backgroundColor: bg,
            borderWidth: 1,
            borderRadius: theme.rounded.full,
            borderColor: c,
          },
        ]}
      >
        <Text
          style={{
            color: c,
            fontWeight: "bold",
            fontSize: theme.typography.size.base,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  macroWrapper: {
    width: "50%",
    flexShrink: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 4,
    minWidth: 0,
  },
  macroLabel: {
    opacity: 0.7,
    flexShrink: 1,
    minWidth: 0,
  },
  macro: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
});

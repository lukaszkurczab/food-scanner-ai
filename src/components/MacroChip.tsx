import React, { useMemo } from "react";
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
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
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
  const chipStyle = useMemo(
    () => ({ backgroundColor: bg, borderColor: c }),
    [bg, c]
  );
  const valueTextStyle = useMemo(() => ({ color: c }), [c]);

  return (
    <View style={[styles.macroWrapper, style]}>
      <View style={styles.labelRow}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.macroLabel}
        >
          {label ?? defaultLabelMap[kind]}
        </Text>
        <Text style={styles.unitText}>
          {unit ?? defaultUnitMap[kind]}
        </Text>
      </View>

      <View style={[styles.macro, chipStyle]}>
        <Text style={[styles.valueText, valueTextStyle]}>
          {value.toFixed(0)}
        </Text>
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    macroWrapper: {
      width: "50%",
      flexShrink: 1,
      minWidth: 0,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.xs / 2,
      marginBottom: theme.spacing.xs,
      minWidth: 0,
    },
    macroLabel: {
      opacity: 0.7,
      flexShrink: 1,
      minWidth: 0,
      color: theme.text,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.medium,
    },
    unitText: {
      opacity: 0.7,
      color: theme.text,
      fontSize: theme.typography.size.sm,
      marginLeft: theme.spacing.sm - theme.spacing.xs / 2,
      flexShrink: 0,
      fontFamily: theme.typography.fontFamily.regular,
    },
    macro: {
      alignItems: "center",
      flexDirection: "row",
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs / 2,
      borderWidth: 1,
      borderRadius: theme.rounded.full,
    },
    valueText: {
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.bold,
    },
  });

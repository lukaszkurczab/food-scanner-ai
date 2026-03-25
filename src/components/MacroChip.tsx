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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["meals"]);

  const accent = useMemo(() => {
    switch (kind) {
      case "kcal":
        return theme.macro.calories;
      case "protein":
        return theme.macro.protein;
      case "carbs":
        return theme.macro.carbs;
      case "fat":
        return theme.macro.fat;
    }
  }, [kind, theme]);

  const softAccent = useMemo(() => {
    switch (kind) {
      case "kcal":
        return theme.macro.caloriesSoft;
      case "protein":
        return theme.macro.proteinSoft;
      case "carbs":
        return theme.macro.carbsSoft;
      case "fat":
        return theme.macro.fatSoft;
    }
  }, [kind, theme]);

  const resolvedLabel = useMemo(() => {
    if (label) return label;

    switch (kind) {
      case "kcal":
        return t("meals:calories");
      case "protein":
        return t("meals:protein");
      case "carbs":
        return t("meals:carbs");
      case "fat":
        return t("meals:fat");
    }
  }, [kind, label, t]);

  const resolvedUnit = useMemo(() => {
    if (unit) return unit;

    switch (kind) {
      case "kcal":
        return "[kcal]";
      case "protein":
      case "carbs":
      case "fat":
        return "[g]";
    }
  }, [kind, unit]);

  const chipStyle = useMemo(
    () => ({
      backgroundColor: softAccent,
      borderColor: accent,
    }),
    [softAccent, accent],
  );

  const valueTextStyle = useMemo(() => ({ color: accent }), [accent]);

  return (
    <View style={[styles.macroWrapper, style]}>
      <View style={styles.labelRow}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.macroLabel}>
          {resolvedLabel}
        </Text>
        <Text style={styles.unitText}>{resolvedUnit}</Text>
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
      marginTop: theme.spacing.xxs,
      marginBottom: theme.spacing.xs,
      minWidth: 0,
    },
    macroLabel: {
      flexShrink: 1,
      minWidth: 0,
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    unitText: {
      color: theme.textTertiary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      marginLeft: theme.spacing.xs,
      flexShrink: 0,
      fontFamily: theme.typography.fontFamily.regular,
    },
    macro: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      minHeight: 36,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      borderRadius: theme.rounded.full,
    },
    valueText: {
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.bold,
    },
  });

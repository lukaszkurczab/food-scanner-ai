import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";

type MacroChipProps = {
  label: string;
  value: number;
};

export const MacroChip: React.FC<MacroChipProps> = ({ label, value }) => {
  const theme = useTheme();
  const { t } = useTranslation(["meals"]);

  let backgroundColor;
  let labelText;
  let color;

  switch (label) {
    case "Carbs":
      backgroundColor = theme.macro.carbs + "18";
      labelText = t("meals:carbs");
      color = theme.macro.carbs;
      break;
    case "Protein":
      backgroundColor = theme.macro.protein + "18";
      labelText = t("meals:protein");
      color = theme.macro.protein;
      break;
    case "Fat":
      labelText = t("meals:fat");
      backgroundColor = theme.macro.fat + "18";
      color = theme.macro.fat;
      break;
    default:
      labelText = t("meals:calories");
      backgroundColor = theme.border + "18";
      color = theme.text;
  }

  return (
    <View style={styles.macroWrapper}>
      <Text
        style={[
          { fontSize: theme.typography.size.base, color: theme.text },
          styles.macroLabel,
        ]}
      >
        {labelText} {label === "Calories" ? "[kcal]" : "[g]"}
      </Text>
      <View
        style={[
          styles.macro,
          {
            backgroundColor: backgroundColor,
            borderWidth: 1,
            borderRadius: theme.rounded.full,
            borderColor: color,
          },
        ]}
      >
        <Text
          style={{
            color: color,
            fontWeight: "bold",
            fontSize: theme.typography.size.md,
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
  },
  macro: {
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  macroLabel: {
    opacity: 0.7,
    marginTop: 2,
    marginBottom: 4,
  },
});

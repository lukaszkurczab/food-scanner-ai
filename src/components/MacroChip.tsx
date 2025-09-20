import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";

type MacroChipProps = {
  label: "Calories" | "Protein" | "Carbs" | "Fat";
  value: number;
};

export const MacroChip: React.FC<MacroChipProps> = ({ label, value }) => {
  const theme = useTheme();
  const { t } = useTranslation(["meals"]);

  let backgroundColor = theme.border + "18";
  let color = theme.text;
  const labelText =
    label === "Calories"
      ? t("meals:calories")
      : t(`meals:${label.toLowerCase()}`);

  if (label === "Protein") {
    backgroundColor = String(theme.macro.protein) + "18";
    color = theme.macro.protein;
  } else if (label === "Carbs") {
    backgroundColor = String(theme.macro.carbs) + "18";
    color = theme.macro.carbs;
  } else if (label === "Fat") {
    backgroundColor = String(theme.macro.fat) + "18";
    color = theme.macro.fat;
  }

  return (
    <View style={styles.macroWrapper}>
      <Text
        style={[
          { fontSize: theme.typography.size.sm, color: theme.text },
          styles.macroLabel,
        ]}
      >
        {labelText} {label === "Calories" ? "[kcal]" : "[g]"}
      </Text>
      <View
        style={[
          styles.macro,
          {
            backgroundColor,
            borderWidth: 1,
            borderRadius: theme.rounded.full,
            borderColor: color,
          },
        ]}
      >
        <Text
          style={{
            color,
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
  macroWrapper: { width: "50%", flexShrink: 1 },
  macro: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  macroLabel: { opacity: 0.7, marginTop: 2, marginBottom: 4 },
});

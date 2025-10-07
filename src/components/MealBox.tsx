import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { TextInput } from "@/components/TextInput";
import { Dropdown } from "@/components/Dropdown";
import { PieChart } from "@/components/PieChart";
import type { MealType, Nutrients } from "@/types/meal";
import { MacroChip } from "./MacroChip";
import { useTranslation } from "react-i18next";

type Option<T extends string> = { label: string; value: T };

const mealTypeOptions: Option<MealType>[] = [
  { value: "breakfast", label: "meals:breakfast" },
  { value: "lunch", label: "meals:lunch" },
  { value: "dinner", label: "meals:dinner" },
  { value: "snack", label: "meals:snack" },
  { value: "other", label: "meals:other" },
];

type MealBoxProps = {
  name: string;
  type: MealType | null;
  nutrition: Nutrients;
  editable?: boolean;
  onNameChange?: (val: string) => void;
  onTypeChange?: (val: MealType) => void;
};

export const MealBox = ({
  name,
  type,
  nutrition,
  editable = false,
  onNameChange,
  onTypeChange,
}: MealBoxProps) => {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);

  const macroChartData = [
    {
      value: nutrition.protein,
      color: theme.macro.protein,
      label: "Protein",
    },
    {
      value: nutrition.fat,
      color: theme.macro.fat,
      label: "Fat",
    },
    {
      value: nutrition.carbs,
      color: theme.macro.carbs,
      label: "Carbs",
    },
  ];

  const renderNutritionGraph = () => {
    if (nutrition.protein || nutrition.carbs || nutrition.fat)
      return (
        <View
          style={{
            alignItems: "center",
            marginTop: theme.spacing.md,
            alignSelf: "center",
          }}
        >
          <PieChart data={macroChartData} maxSize={140} />
        </View>
      );
  };

  return (
    <View
      style={{
        backgroundColor: theme.background,
        borderRadius: theme.rounded.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        shadowColor: theme.shadow,
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 3,
        marginTop: theme.spacing.lg,
      }}
    >
      {editable ? (
        <TextInput
          value={name}
          onChangeText={onNameChange || (() => {})}
          placeholder={t("ingredient_name", { ns: "meals" })}
          numberOfLines={1}
          maxLength={48}
        />
      ) : (
        <Text
          style={{
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.xl,
            color: theme.text,
          }}
        >
          {name}
        </Text>
      )}

      <View style={{ marginVertical: theme.spacing.md }}>
        {editable ? (
          <Dropdown
            value={type ?? "breakfast"}
            style={{ marginTop: theme.spacing.sm }}
            options={mealTypeOptions.map((opt) => ({
              ...opt,
              label: t(opt.label),
            }))}
            onChange={(val) => {
              if (val) onTypeChange?.(val);
            }}
          />
        ) : (
          <Text
            style={{
              fontSize: theme.typography.size.md,
              color: theme.text,
            }}
          >
            {type ? t(`meals:${type}`) : ""}
          </Text>
        )}
      </View>

      <MacroChip
        label={t("calories", { ns: "meals" })}
        value={nutrition.kcal}
      />
      <View style={styles.macrosRow}>
        <MacroChip
          label={t("protein", { ns: "meals" })}
          value={nutrition.protein}
        />
        <MacroChip
          label={t("carbs", { ns: "meals" })}
          value={nutrition.carbs}
        />
        <MacroChip
          label={t("fat", { ns: "meals" })}
          value={nutrition.fat}
        />
      </View>

      {renderNutritionGraph()}
    </View>
  );
};

const styles = StyleSheet.create({
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 2,
    gap: 10,
  },
});

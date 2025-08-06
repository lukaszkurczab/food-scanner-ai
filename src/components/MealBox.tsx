import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { TextInput, Dropdown, PieChart } from "@/src/components";
import type { MealType, Nutrients } from "@/src/types/meal";
import { MacroChip } from "./MacroChip";

type Option<T extends string> = { label: string; value: T };

const mealTypeOptions: Option<MealType>[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "other", label: "Other" },
];

type MealBoxProps = {
  name: string;
  type: MealType | null;
  nutrition: Nutrients;
  editable?: boolean;
  onNameChange?: (val: string) => void;
  onTypeChange?: (val: MealType) => void;
};

export const MealBox: React.FC<MealBoxProps> = ({
  name,
  type,
  nutrition,
  editable = false,
  onNameChange,
  onTypeChange,
}) => {
  const theme = useTheme();

  const macroChartData = [
    { value: nutrition.protein, color: theme.macro.protein, label: "Protein" },
    { value: nutrition.fat, color: theme.macro.fat, label: "Fat" },
    { value: nutrition.carbs, color: theme.macro.carbs, label: "Carbs" },
  ];

  return (
    <View
      style={{
        backgroundColor: theme.card,
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
          placeholder="Enter meal name"
          numberOfLines={1}
          maxLength={48}
        />
      ) : (
        <Text
          style={{
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.xl,
            color: theme.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          {name}
        </Text>
      )}

      <View style={{ marginVertical: theme.spacing.md }}>
        {editable ? (
          <Dropdown
            value={type || "breakfast"}
            options={mealTypeOptions}
            onChange={onTypeChange || (() => {})}
          />
        ) : (
          <Text>{type}</Text>
        )}
      </View>

      <MacroChip label="Calories" value={nutrition.kcal} />
      <View style={styles.macrosRow}>
        <MacroChip label="Protein" value={nutrition.protein} />
        <MacroChip label="Carbs" value={nutrition.carbs} />
        <MacroChip label="Fat" value={nutrition.fat} />
      </View>

      <View style={{ alignItems: "center", marginTop: theme.spacing.md }}>
        <PieChart data={macroChartData} size={140} />
      </View>
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

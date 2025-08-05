import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { LongTextInput } from "@/src/components/LongTextInput";
import { Dropdown } from "@/src/components/Dropdown";
import { PieChart } from "@/src/components/PieChart";
import type { MealType, Nutrients } from "@/src/types/meal";

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
    { value: nutrition.protein, color: theme.macro.protein },
    { value: nutrition.fat, color: theme.macro.fat },
    { value: nutrition.carbs, color: theme.macro.carbs },
  ];

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: theme.rounded.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        shadowColor: theme.shadow,
        shadowOpacity: 0.07,
        shadowRadius: 12,
      }}
    >
      {editable ? (
        <LongTextInput
          value={name}
          onChangeText={onNameChange || (() => {})}
          label="Meal name"
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

      <View style={{ marginBottom: theme.spacing.md }}>
        <Dropdown
          label="Type"
          value={type || "breakfast"}
          options={mealTypeOptions}
          onChange={onTypeChange || (() => {})}
          disabled={!editable}
          style={{ marginTop: 0, marginBottom: 0 }}
        />
      </View>

      <View style={{ alignItems: "center", marginBottom: theme.spacing.md }}>
        <PieChart data={macroChartData} size={140} />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: theme.spacing.sm,
        }}
      >
        <Text style={{ color: theme.macro.carbs }}>
          {nutrition.carbs}g Carbs
        </Text>
        <Text style={{ color: theme.macro.protein }}>
          {nutrition.protein}g Protein
        </Text>
        <Text style={{ color: theme.macro.fat }}>{nutrition.fat}g Fat</Text>
      </View>
      <Text
        style={{
          color: theme.textSecondary,
          fontSize: theme.typography.size.md,
        }}
      >
        Calories: {nutrition.kcal} kcal
      </Text>
    </View>
  );
};

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
  addedAt?: string;
  editable?: boolean;
  onNameChange?: (val: string) => void;
  onTypeChange?: (val: MealType) => void;
};

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

const fmt = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
    try {
      return new Intl.DateTimeFormat(undefined, dateTimeOptions).format(d);
    } catch {
      // fall through to fallback below
    }
  }

  return d.toLocaleString(undefined, dateTimeOptions);
};

export const MealBox = ({
  name,
  type,
  nutrition,
  addedAt,
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
      label: t("meals:protein"),
    },
    { value: nutrition.fat, color: theme.macro.fat, label: t("meals:fat") },
    {
      value: nutrition.carbs,
      color: theme.macro.carbs,
      label: t("meals:carbs"),
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
          <>
            <Text
              style={{
                fontSize: theme.typography.size.md,
                color: theme.text,
              }}
            >
              {type ? t(`meals:${type}`) : ""}
            </Text>
            {!!addedAt && (
              <Text
                style={{
                  marginTop: 4,
                  fontSize: theme.typography.size.sm,
                  color: theme.text,
                  opacity: 0.7,
                }}
              >
                {t("meals:added_at")}: {fmt(addedAt)}
              </Text>
            )}
          </>
        )}
      </View>

      <MacroChip kind="kcal" value={nutrition.kcal} />
      <View style={styles.macrosRow}>
        <MacroChip kind="protein" value={nutrition.protein} />
        <MacroChip kind="carbs" value={nutrition.carbs} />
        <MacroChip kind="fat" value={nutrition.fat} />
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

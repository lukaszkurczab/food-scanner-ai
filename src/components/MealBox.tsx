import { useMemo } from "react";
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

  if (
    typeof Intl !== "undefined" &&
    typeof Intl.DateTimeFormat === "function"
  ) {
    try {
      return new Intl.DateTimeFormat(undefined, dateTimeOptions).format(d);
    } catch {
      //
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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["meals", "common"]);

  const macroChartData = useMemo(
    () => [
      {
        value: nutrition.protein,
        color: theme.macro.protein,
        label: t("meals:protein"),
      },
      {
        value: nutrition.fat,
        color: theme.macro.fat,
        label: t("meals:fat"),
      },
      {
        value: nutrition.carbs,
        color: theme.macro.carbs,
        label: t("meals:carbs"),
      },
    ],
    [nutrition.protein, nutrition.fat, nutrition.carbs, theme.macro, t],
  );

  const hasMacroData =
    nutrition.protein > 0 || nutrition.carbs > 0 || nutrition.fat > 0;

  return (
    <View style={styles.container}>
      {editable ? (
        <TextInput
          value={name}
          onChangeText={onNameChange || (() => {})}
          placeholder={t("ingredient_name", { ns: "meals" })}
          numberOfLines={1}
          maxLength={48}
        />
      ) : (
        <Text style={styles.nameText}>{name}</Text>
      )}

      <View style={styles.typeSection}>
        {editable ? (
          <Dropdown
            value={type ?? "breakfast"}
            style={styles.typeDropdown}
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
            <Text style={styles.typeText}>
              {type ? t(`meals:${type}`) : ""}
            </Text>
            {!!addedAt && (
              <Text style={styles.addedAtText}>
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

      {hasMacroData ? (
        <View style={styles.graphWrapper}>
          <PieChart data={macroChartData} maxSize={140} />
        </View>
      ) : null}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: theme.rounded.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.isDark ? 0.2 : 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    nameText: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.h2,
      lineHeight: theme.typography.lineHeight.h2,
      color: theme.text,
    },
    typeSection: {
      marginVertical: theme.spacing.md,
    },
    typeDropdown: {
      marginTop: theme.spacing.sm,
    },
    typeText: {
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.medium,
    },
    addedAtText: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
    },
    macrosRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      gap: theme.spacing.sm,
    },
    graphWrapper: {
      alignItems: "center",
      marginTop: theme.spacing.md,
      alignSelf: "center",
    },
  });

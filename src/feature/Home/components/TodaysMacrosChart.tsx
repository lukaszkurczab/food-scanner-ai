import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PieChart } from "@/components";
import { useTranslation } from "react-i18next";

export const TodaysMacrosChart = ({
  macros,
}: {
  macros: { protein: number; fat: number; carbs: number };
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const { t } = useTranslation("home");

  const data = useMemo(
    () => [
      { value: macros.protein, color: theme.macro.protein, label: "Protein" },
      { value: macros.fat, color: theme.macro.fat, label: "Fat" },
      { value: macros.carbs, color: theme.macro.carbs, label: "Carbs" },
    ],
    [macros.protein, macros.fat, macros.carbs, theme.macro]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t("todaysMacros")}
      </Text>
      <PieChart data={data} maxSize={120} justify="space-around" />
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      padding: theme.spacing.md,
      borderRadius: theme.rounded.md,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.lg,
      marginBottom: theme.spacing.lg,
      fontFamily: theme.typography.fontFamily.bold,
    },
  });

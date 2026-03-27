import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import AppIcon from "@/components/AppIcon";
import { useTranslation } from "react-i18next";

export const DateRangePicker: React.FC<{
  startDate: Date;
  endDate: Date;
  onOpen: () => void;
  locale?: string;
}> = ({ startDate, endDate, onOpen, locale }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("common");

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
      }),
    [locale],
  );

  const summary = `${fmt.format(startDate)} - ${fmt.format(endDate)}`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t("dateRange.label")}</Text>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={t("dateRange.set")}
        style={({ pressed }) => [
          styles.field,
          pressed ? styles.fieldPressed : null,
        ]}
      >
        <View style={styles.valueWrap}>
          <Text style={styles.value}>{summary}</Text>
          <Text style={styles.hint}>{t("dateRange.set")}</Text>
        </View>
        <AppIcon name="calendar" size={20} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.labelS,
      lineHeight: theme.typography.lineHeight.labelS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    field: {
      minHeight: 56,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      borderColor: theme.input.border,
      backgroundColor: theme.input.background,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    fieldPressed: {
      backgroundColor: theme.surfaceAlt,
      borderColor: theme.input.borderFocused,
    },
    valueWrap: {
      flex: 1,
    },
    value: {
      color: theme.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
    },
    hint: {
      marginTop: theme.spacing.xxs,
      color: theme.textSecondary,
      fontSize: theme.typography.size.labelS,
      lineHeight: theme.typography.lineHeight.labelS,
      fontFamily: theme.typography.fontFamily.medium,
    },
  });

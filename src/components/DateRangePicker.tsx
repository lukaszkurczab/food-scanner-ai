import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components";
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
      <View style={styles.headerRow}>
        <Text style={styles.label}>{t("dateRange.label")}</Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>

      <Button label={t("dateRange.set")} variant="secondary" onPress={onOpen} />
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    label: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
      flexShrink: 0,
    },
    summary: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.medium,
      textAlign: "right",
      flex: 1,
    },
  });

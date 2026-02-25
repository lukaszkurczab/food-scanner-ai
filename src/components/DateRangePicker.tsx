import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { SecondaryButton } from "@/components/SecondaryButton";
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
    [locale]
  );

  const summary = `${fmt.format(startDate)} - ${fmt.format(endDate)}`;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{t("dateRange.label")}</Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>

      <SecondaryButton label={t("dateRange.set")} onPress={onOpen} />
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
    },
    label: {
      color: theme.text,
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.bold,
    },
    summary: {
      color: theme.text,
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });

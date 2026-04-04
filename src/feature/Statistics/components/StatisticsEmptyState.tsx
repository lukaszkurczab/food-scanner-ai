import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import AppIcon from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";
import type { StatisticsEmptyKind } from "@/feature/Statistics/types";

type Props = {
  kind: StatisticsEmptyKind;
  isOffline: boolean;
};

export function StatisticsEmptyState({ kind, isOffline }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["statistics"]);

  const resolvedTitle =
    isOffline && kind === "no_history"
      ? t("statistics:offlineEmpty.title")
      : kind === "no_entries_in_range"
        ? t("statistics:emptyRange.title")
        : t("statistics:empty.title");

  const resolvedBody =
    isOffline && kind === "no_history"
      ? t("statistics:offlineEmpty.desc")
      : kind === "no_entries_in_range"
        ? t("statistics:emptyRange.desc")
        : t("statistics:empty.desc");

  const resolvedFoot =
    kind === "no_entries_in_range"
      ? t("statistics:emptyRange.foot")
      : t("statistics:empty.foot");

  return (
    <View style={styles.root}>
      <View style={styles.motifCluster}>
        <View style={styles.motifFrame}>
          <AppIcon name="trend-up" size={32} color={theme.primaryStrong} />
        </View>
      </View>

      <Text style={styles.title}>{resolvedTitle}</Text>
      <Text style={styles.body}>{resolvedBody}</Text>

      <View style={styles.footPill}>
        <View style={styles.footDot} />
        <Text style={styles.footText}>{resolvedFoot}</Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.display,
    },
    motifCluster: {
      width: 120,
      height: 92,
      alignItems: "center",
      justifyContent: "center",
    },
    motifFrame: {
      width: 88,
      height: 64,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.h1,
      lineHeight: theme.typography.lineHeight.h1,
      textAlign: "center",
    },
    body: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      textAlign: "center",
      maxWidth: 280,
    },
    footPill: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.surface,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    footDot: {
      width: theme.spacing.xxs + 2,
      height: theme.spacing.xxs + 2,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.primary,
    },
    footText: {
      color: theme.textTertiary,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
  });

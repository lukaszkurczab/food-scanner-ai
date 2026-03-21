import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";
import type { WeeklyReport } from "@/services/weeklyReport/weeklyReportTypes";

type Props = {
  loading: boolean;
  report: WeeklyReport;
  onPress: () => void;
};

function getTitle(report: WeeklyReport): string {
  if (report.status === "ready") {
    return "Last 7 complete days";
  }
  if (report.status === "insufficient_data") {
    return "Not enough data for a weekly read yet";
  }
  return "Weekly report unavailable";
}

function getBody(report: WeeklyReport): string {
  if (report.summary) {
    return report.summary;
  }
  if (report.status === "insufficient_data") {
    return "Log a few complete days and this surface will unlock.";
  }
  return "Open the report to see the latest status.";
}

export default function WeeklyReportCard({
  loading,
  report,
  onPress,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        report.status === "ready" ? styles.readyContainer : null,
        report.status === "insufficient_data" ? styles.insufficientContainer : null,
        pressed ? styles.pressed : null,
      ]}
      testID="weekly-report-card"
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Weekly report</Text>
        <Text style={styles.title}>
          {loading ? "Loading weekly report..." : getTitle(report)}
        </Text>
      </View>
      <Text style={styles.body}>
        {loading ? "Checking the latest closed week." : getBody(report)}
      </Text>
      <Text style={styles.cta}>Open report</Text>
    </Pressable>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.rounded.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      borderWidth: 1,
      backgroundColor: theme.card,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    },
    readyContainer: {
      borderColor: theme.success.background,
    },
    insufficientContainer: {
      borderColor: theme.warning.background,
    },
    pressed: {
      opacity: 0.9,
    },
    header: {
      gap: theme.spacing.xs,
    },
    eyebrow: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.bold,
    },
    body: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.md,
      lineHeight: 22,
    },
    cta: {
      color: theme.accentSecondary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
    },
  });

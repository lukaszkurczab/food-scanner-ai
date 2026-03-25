import { useMemo, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { BackTitleHeader, Layout } from "@/components";
import { useAuthContext } from "@/context/AuthContext";
import { useWeeklyReport } from "@/hooks/useWeeklyReport";
import type { RootStackParamList } from "@/navigation/navigate";
import type {
  WeeklyReportInsight,
  WeeklyReportPriority,
} from "@/services/weeklyReport/weeklyReportTypes";
import { useTheme } from "@/theme/useTheme";

type WeeklyReportNavigation = StackNavigationProp<
  RootStackParamList,
  "WeeklyReport"
>;

type Props = {
  navigation: WeeklyReportNavigation;
};

function formatPeriod(startDay: string, endDay: string): string {
  return `${startDay} to ${endDay}`;
}

function InsightRow({ insight }: { insight: WeeklyReportInsight }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.block,
        insight.tone === "positive"
          ? styles.positiveBlock
          : insight.tone === "negative"
            ? styles.negativeBlock
            : styles.neutralBlock,
      ]}
    >
      <Text style={styles.blockEyebrow}>
        {insight.importance === "high" ? "Key insight" : "Insight"}
      </Text>
      <Text style={styles.blockTitle}>{insight.title}</Text>
      <Text style={styles.blockBody}>{insight.body}</Text>
    </View>
  );
}

function PriorityRow({ priority }: { priority: WeeklyReportPriority }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.priorityRow}>
      <Text style={styles.priorityBullet}>•</Text>
      <Text style={styles.priorityText}>{priority.text}</Text>
    </View>
  );
}

function StateBlock({
  title,
  body,
  loading = false,
}: {
  title: string;
  body: string;
  loading?: boolean;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.centerBox}>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
    </View>
  );
}

export default function WeeklyReportScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { uid } = useAuthContext();
  const { report, loading, enabled, status } = useWeeklyReport({ uid });

  let content: ReactNode;
  if (loading) {
    content = (
      <StateBlock
        loading
        title="Loading weekly report"
        body="Checking the latest closed week."
      />
    );
  } else if (
    enabled &&
    status === "live_success" &&
    report.status === "ready"
  ) {
    content = (
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Latest closed week</Text>
          <Text style={styles.heroPeriod}>
            {formatPeriod(report.period.startDay, report.period.endDay)}
          </Text>
          {report.summary ? (
            <Text style={styles.heroSummary}>{report.summary}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What mattered most</Text>
          <View style={styles.sectionStack}>
            {report.insights.map((insight) => (
              <InsightRow
                key={`${insight.type}:${insight.title}`}
                insight={insight}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next week priorities</Text>
          <View style={styles.priorityCard}>
            {report.priorities.map((priority) => (
              <PriorityRow
                key={`${priority.type}:${priority.text}`}
                priority={priority}
              />
            ))}
          </View>
        </View>
      </View>
    );
  } else if (
    enabled &&
    status === "live_success" &&
    report.status === "insufficient_data"
  ) {
    content = (
      <StateBlock
        title="Not enough data yet"
        body="Log a few more complete days and this weekly report will unlock."
      />
    );
  } else {
    content = (
      <StateBlock
        title="Weekly report unavailable"
        body="This surface is not ready right now. Try again later."
      />
    );
  }

  return (
    <Layout showNavigation={false}>
      <BackTitleHeader
        title="Weekly report"
        onBack={() => navigation.goBack()}
      />
      {content}
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    hero: {
      borderRadius: theme.rounded.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.border,
    },
    heroEyebrow: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      fontFamily: theme.typography.fontFamily.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    heroPeriod: {
      color: theme.text,
      fontSize: theme.typography.size.h1,
      fontFamily: theme.typography.fontFamily.bold,
    },
    heroSummary: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: 22,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      fontFamily: theme.typography.fontFamily.bold,
    },
    sectionStack: {
      gap: theme.spacing.sm,
    },
    block: {
      borderRadius: theme.rounded.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
      borderWidth: 1,
      backgroundColor: theme.surfaceElevated,
    },
    positiveBlock: {
      borderColor: theme.success.surface,
    },
    neutralBlock: {
      borderColor: theme.border,
    },
    negativeBlock: {
      borderColor: theme.warning.surface,
    },
    blockEyebrow: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      fontFamily: theme.typography.fontFamily.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    blockTitle: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      fontFamily: theme.typography.fontFamily.bold,
    },
    blockBody: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: 22,
    },
    priorityCard: {
      borderRadius: theme.rounded.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.border,
    },
    priorityRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    priorityBullet: {
      color: theme.primary,
      fontSize: theme.typography.size.title,
      lineHeight: 22,
    },
    priorityText: {
      flex: 1,
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: 22,
      fontFamily: theme.typography.fontFamily.medium,
    },
    centerBox: {
      flex: 1,
      minHeight: 320,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    stateTitle: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
    },
    stateBody: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: 22,
      textAlign: "center",
    },
  });

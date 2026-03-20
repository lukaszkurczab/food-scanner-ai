import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { RootStackParamList } from "@/navigation/navigate";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import type { CoachInsight } from "@/services/coach/coachTypes";
import {
  trackCoachCardCtaClicked,
  trackCoachCardExpanded,
  trackCoachCardViewed,
} from "@/services/telemetry/telemetryInstrumentation";

type Props = {
  insight: CoachInsight;
  onPressCta?: () => void;
  ctaTargetScreen?: Extract<keyof RootStackParamList, "MealAddMethod" | "Chat" | "HistoryList">;
};

export default function CoachInsightCard({
  insight,
  onPressCta,
  ctaTargetScreen,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("home");
  const [expanded, setExpanded] = useState(false);

  const getReasonLabel = (reasonCode: string): string => {
    switch (reasonCode) {
      case "valid_logging_days_7_low":
        return t("coachInsight.reasons.valid_logging_days_7_low", {
          defaultValue: "There have been too few solid logging days recently.",
        });
      case "logging_consistency_28_low":
        return t("coachInsight.reasons.logging_consistency_28_low", {
          defaultValue: "Logging consistency across the last few weeks is still low.",
        });
      case "missing_nutrition_meals_today":
        return t("coachInsight.reasons.missing_nutrition_meals_today", {
          defaultValue: "At least one meal today is missing useful nutrition detail.",
        });
      case "unknown_meal_details_14_high":
        return t("coachInsight.reasons.unknown_meal_details_14_high", {
          defaultValue: "Recent meals have been too vague to read clearly.",
        });
      case "protein_hit_ratio_14_low":
        return t("coachInsight.reasons.protein_hit_ratio_14_low", {
          defaultValue: "Protein targets are being missed on too many logged days.",
        });
      case "kcal_under_target_ratio_14_high":
        return t("coachInsight.reasons.kcal_under_target_ratio_14_high", {
          defaultValue: "Recent intake is landing under your calorie target too often.",
        });
      case "meal_coverage_14_low":
        return t("coachInsight.reasons.meal_coverage_14_low", {
          defaultValue: "There are too few complete meal days to read the pattern well.",
        });
      case "streak_positive":
        return t("coachInsight.reasons.streak_positive", {
          defaultValue: "You have recent momentum worth protecting.",
        });
      case "consistency_improving":
        return t("coachInsight.reasons.consistency_improving", {
          defaultValue: "Logging consistency is moving in the right direction.",
        });
      case "insufficient_data":
        return t("coachInsight.reasons.insufficient_data", {
          defaultValue: "There is not enough recent data to form a stronger insight yet.",
        });
      default:
        return t("coachInsight.reasons.generic", {
          defaultValue: "This insight comes from your recent logging pattern.",
        });
    }
  };

  const reasonText = insight.reasonCodes.length > 0
    ? insight.reasonCodes
      .map((reasonCode) => `• ${getReasonLabel(reasonCode)}`)
      .join("\n")
    : getReasonLabel("generic");

  const showCta =
    insight.actionType !== "none" &&
    typeof insight.actionLabel === "string" &&
    insight.actionLabel.trim().length > 0 &&
    typeof onPressCta === "function" &&
    !!ctaTargetScreen;

  useEffect(() => {
    void trackCoachCardViewed({
      insightType: insight.type,
      actionType: insight.actionType,
      isPositive: insight.isPositive,
    }).catch(() => undefined);
  }, [insight.actionType, insight.isPositive, insight.type]);

  const handleExpandToggle = () => {
    setExpanded((current) => {
      const next = !current;
      if (next) {
        void trackCoachCardExpanded({
          insightType: insight.type,
        }).catch(() => undefined);
      }
      return next;
    });
  };

  const handlePressCta = () => {
    if (!showCta || !ctaTargetScreen) {
      return;
    }
    void trackCoachCardCtaClicked({
      insightType: insight.type,
      actionType: insight.actionType,
      targetScreen: ctaTargetScreen,
    }).catch(() => undefined);
    onPressCta?.();
  };

  return (
    <View
      style={[
        styles.container,
        insight.isPositive ? styles.containerPositive : styles.containerNeutral,
      ]}
      testID="coach-insight-card"
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, insight.isPositive ? styles.eyebrowPositive : null]}>
          {insight.isPositive
            ? t("coachInsight.positiveEyebrow", "Momentum")
            : t("coachInsight.defaultEyebrow", "Coach insight")}
        </Text>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.body}>{insight.body}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleExpandToggle}
        style={({ pressed }) => [styles.expander, pressed ? styles.expanderPressed : null]}
      >
        <Text style={styles.expanderText}>
          {expanded
            ? t("coachInsight.hideWhy", "Hide why")
            : t("coachInsight.showWhy", "Why am I seeing this?")}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonTitle}>
            {t("coachInsight.whyTitle", "This is based on your recent logging")}
          </Text>
          <Text style={styles.reasonText}>{reasonText}</Text>
        </View>
      ) : null}

      {showCta ? (
        <PrimaryButton
          label={insight.actionLabel ?? undefined}
          onPress={handlePressCta}
          testID="coach-insight-cta"
        />
      ) : null}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.rounded.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      borderWidth: 1,
      backgroundColor: theme.card,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    },
    containerNeutral: {
      borderColor: theme.border,
    },
    containerPositive: {
      borderColor: theme.success.background,
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
    eyebrowPositive: {
      color: theme.success.text,
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
    expander: {
      alignSelf: "flex-start",
    },
    expanderPressed: {
      opacity: 0.75,
    },
    expanderText: {
      color: theme.accentSecondary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
    },
    reasonBox: {
      backgroundColor: theme.background,
      borderRadius: theme.rounded.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    reasonTitle: {
      color: theme.text,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
    },
    reasonText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
      lineHeight: 20,
    },
  });

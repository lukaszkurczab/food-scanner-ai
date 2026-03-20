import { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { useTranslation } from "react-i18next";
import type { CoachEmptyReason } from "@/services/coach/coachTypes";
import { trackCoachEmptyStateViewed } from "@/services/telemetry/telemetryInstrumentation";

type CommonProps = {
  isToday: boolean;
  isOffline?: boolean;
  onAddMeal?: () => void;
  onOpenHistory?: () => void;
};

type PlainEmptyDayProps = {
  mode?: "plain";
  coachEmptyReason?: null;
};

type CoachAwareEmptyDayProps = {
  mode: "coach_aware";
  coachEmptyReason: CoachEmptyReason;
};

type Props = CommonProps & (
  | PlainEmptyDayProps
  | CoachAwareEmptyDayProps
);

export default function EmptyDayView({
  mode = "plain",
  isToday,
  isOffline = false,
  onAddMeal,
  onOpenHistory,
  coachEmptyReason = null,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("home");
  const isCoachAware = mode === "coach_aware";

  const coachHintKey = useMemo(() => {
    if (!isCoachAware || !coachEmptyReason) {
      return null;
    }

    if (coachEmptyReason === "insufficient_data") {
      return isToday
        ? "emptyDay.coachHint_insufficient_today"
        : "emptyDay.coachHint_insufficient_past";
    }

    return isToday
      ? "emptyDay.coachHint_today"
      : "emptyDay.coachHint_past";
  }, [coachEmptyReason, isCoachAware, isToday]);

  useEffect(() => {
    if (!isCoachAware || !coachEmptyReason) {
      return;
    }

    void trackCoachEmptyStateViewed({
      emptyReason: coachEmptyReason,
    }).catch(() => undefined);
  }, [coachEmptyReason, isCoachAware]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t("emptyDay.title")}
      </Text>

      {(isToday || isOffline) && (
        <Text style={styles.subtitle}>
          {isOffline
            ? isToday
              ? t("emptyDay.subtitle_offline_today")
              : t("emptyDay.subtitle_offline_past")
            : t("emptyDay.subtitle_today")}
        </Text>
      )}

      {isCoachAware && coachHintKey ? (
        <View style={styles.coachBox}>
          <Text style={styles.coachEyebrow}>
            {t("emptyDay.coachTitle", "Coaching note")}
          </Text>
          <Text style={styles.coachText}>
            {t(
              coachHintKey,
              isToday
                ? "Start with one complete meal log so coaching has real data to work with."
                : "Use history for context, then keep the next meal log complete so trends stay readable.",
            )}
          </Text>
        </View>
      ) : null}

      {isToday && onAddMeal ? (
        <PrimaryButton
          label={t("emptyDay.addMeal")}
          onPress={onAddMeal}
        />
      ) : null}

      {!isToday && onOpenHistory ? (
        <SecondaryButton
          label={t("emptyDay.openHistory")}
          onPress={onOpenHistory}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      padding: theme.spacing.lg,
      borderRadius: theme.rounded.md,
      alignItems: "center",
      gap: theme.spacing.md,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.bold,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.md,
      textAlign: "center",
    },
    coachBox: {
      alignSelf: "stretch",
      backgroundColor: theme.background,
      borderRadius: theme.rounded.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    coachEyebrow: {
      color: theme.accentSecondary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    coachText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
      lineHeight: 20,
      textAlign: "left",
    },
  });

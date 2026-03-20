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

  const coachAwareCopy = useMemo(() => {
    if (!isCoachAware || !coachEmptyReason) {
      return null;
    }

    return {
      title: t(`emptyDay.coachAware.${coachEmptyReason}.title`),
      body: t(`emptyDay.coachAware.${coachEmptyReason}.body`),
      whyTitle: t("emptyDay.coachAware.whyTitle", "Why am I seeing this?"),
      whyBody: t(`emptyDay.coachAware.${coachEmptyReason}.whyBody`),
    };
  }, [coachEmptyReason, isCoachAware, t]);

  const titleText = coachAwareCopy?.title ?? t("emptyDay.title");
  const subtitleText = coachAwareCopy?.body ?? (
    isOffline
      ? isToday
        ? t("emptyDay.subtitle_offline_today")
        : t("emptyDay.subtitle_offline_past")
      : isToday
        ? t("emptyDay.subtitle_today")
        : null
  );

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
        {titleText}
      </Text>

      {subtitleText ? (
        <Text style={styles.subtitle}>
          {subtitleText}
        </Text>
      ) : null}

      {coachAwareCopy ? (
        <View style={styles.coachBox}>
          <Text style={styles.coachEyebrow}>{coachAwareCopy.whyTitle}</Text>
          <Text style={styles.coachText}>
            {coachAwareCopy.whyBody}
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

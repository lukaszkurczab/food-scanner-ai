import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { useTranslation } from "react-i18next";

type Props = {
  isToday: boolean;
  onAddMeal?: () => void;
  onOpenHistory?: () => void;
};

export default function EmptyDayView({
  isToday,
  onAddMeal,
  onOpenHistory,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("home");
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t("emptyDay.title")}
      </Text>

      {isToday ? (
        <>
          <Text
            style={styles.subtitle}
          >
            {t("emptyDay.subtitle_today")}
          </Text>
          {onAddMeal ? (
            <PrimaryButton
              label={t("emptyDay.addMeal")}
              onPress={onAddMeal}
            />
          ) : null}
        </>
      ) : (
        <>
          {onOpenHistory ? (
            <SecondaryButton
              label={t("emptyDay.openHistory")}
              onPress={onOpenHistory}
            />
          ) : null}
        </>
      )}
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
  });

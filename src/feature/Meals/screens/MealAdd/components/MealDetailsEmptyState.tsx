import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components";
import { useTheme } from "@/theme/useTheme";

type MealDetailsEmptyStateProps = {
  uid: string | null | undefined;
  isManualMode: boolean;
  reviewFallbackLabel?: string;
  onRetry: () => void;
  onSecondaryAction: () => void;
};

export default function MealDetailsEmptyState({
  uid,
  isManualMode,
  reviewFallbackLabel,
  onRetry,
  onSecondaryAction,
}: MealDetailsEmptyStateProps) {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const styles = createStyles(theme);

  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>{t("resultUnavailable.title", { ns: "meals" })}</Text>
      <Text style={styles.emptyDescription}>
        {!uid
          ? t("resultUnavailable.authDesc", { ns: "meals" })
          : t("resultUnavailable.desc", { ns: "meals" })}
      </Text>
      <Button
        label={t("retry", { ns: "common" })}
        onPress={onRetry}
        disabled={!uid}
        style={styles.emptyAction}
      />
      <Button
        variant="secondary"
        label={
          isManualMode
            ? t("back_home", { ns: "meals" })
            : (reviewFallbackLabel ??
              t("review_meal_edit_done", {
                ns: "meals",
                defaultValue: "Back to review",
              }))
        }
        onPress={onSecondaryAction}
        style={styles.emptyAction}
      />
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.screenPadding,
      paddingBottom: theme.spacing.xl,
    },
    emptyTitle: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
    },
    emptyDescription: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      textAlign: "center",
      maxWidth: 320,
    },
    emptyAction: {
      alignSelf: "stretch",
    },
  });

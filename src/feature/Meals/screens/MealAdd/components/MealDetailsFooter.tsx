import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components";
import { MealAddTextLink } from "@/feature/Meals/components/MealAddPhotoScaffold";
import { useTheme } from "@/theme/useTheme";

type MealDetailsFooterProps = {
  isManualMode: boolean;
  manualSubmitDisabled: boolean;
  reviewSubmitLabel?: string;
  onSubmit: () => void;
  onChangeMethod: () => void;
};

export default function MealDetailsFooter({
  isManualMode,
  manualSubmitDisabled,
  reviewSubmitLabel,
  onSubmit,
  onChangeMethod,
}: MealDetailsFooterProps) {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const styles = createStyles(theme);

  return (
    <View style={styles.footer}>
      <Button
        label={
          isManualMode
            ? t("manual_entry_primary_cta", {
                ns: "meals",
                defaultValue: "Prepare review",
              })
            : (reviewSubmitLabel ??
              t("review_meal_edit_done", {
                ns: "meals",
                defaultValue: "Back to review",
              }))
        }
        onPress={onSubmit}
        disabled={isManualMode ? manualSubmitDisabled : false}
        testID={isManualMode ? "manual-meal-save-button" : undefined}
      />
      {isManualMode ? (
        <MealAddTextLink
          label={t("change_method", {
            ns: "meals",
            defaultValue: "Change add method",
          })}
          onPress={onChangeMethod}
          testID="manual-change-method-button"
        />
      ) : null}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
      backgroundColor: theme.background,
    },
  });

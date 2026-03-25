import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { SecondaryButton, Layout } from "@/components";
import AppIcon from "@/components/AppIcon";
import type {
  MealAddScreenName,
  MealAddScreenProps,
} from "@/feature/Meals/feature/MapMealAddScreens";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";

const MAX_ATTEMPTS = 3;

export default function BarcodeProductNotFoundScreen({
  navigation,
  params,
}: MealAddScreenProps<"BarcodeProductNotFound">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("meals");

  const code = params?.code;
  const attempt = params?.attempt || 1;
  const returnTo: MealAddScreenName = params?.returnTo || "Result";

  const isLastAttempt = attempt >= MAX_ATTEMPTS;

  const handleRetry = () => {
    if (isLastAttempt) {
      handleBack();
      return;
    }

    navigation.replace("AddMeal", {
      start: "MealCamera",
      barcodeOnly: true,
      attempt: attempt + 1,
      returnTo,
    });
  };

  const handleBack = () => {
    navigation.replace("AddMeal", {
      start: returnTo,
    });
  };

  return (
    <Layout>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <AppIcon name="scan-barcode" size={64} color={theme.textSecondary} />
        </View>
        <Text style={styles.title}>
          {t("barcode_not_found_title", "We couldn't find this product")}
        </Text>
        <Text style={styles.subtitle}>
          {isLastAttempt
            ? t(
                "barcode_not_found_last",
                "We still couldn't find the product. Please add the meal manually or choose a different method.",
              )
            : t("barcode_not_found_sub", {
                defaultValue:
                  "We couldn't get nutrition data for this barcode. You can try again or choose a different method.",
              })}
        </Text>
        {code ? (
          <Text style={styles.code}>
            {t("barcode_code_label", "Scanned code")}: {code}
          </Text>
        ) : null}
        <View style={styles.spacer} />
        {!isLastAttempt && (
          <GlobalActionButtons
            label={`${t("barcode_try_again", "Scan again")} (${attempt}/${MAX_ATTEMPTS})`}
            onPress={handleRetry}
            secondaryLabel={t("barcode_back_to_review", "Back to ingredients")}
            secondaryOnPress={handleBack}
            containerStyle={styles.buttonSpacingNone}
          />
        )}
        {isLastAttempt ? (
          <SecondaryButton
            label={t("barcode_back_to_review", "Back to ingredients")}
            onPress={handleBack}
            style={styles.buttonSpacing}
          />
        ) : null}
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.background,
    },
    iconWrapper: {
      width: 140,
      height: 140,
      borderRadius: theme.rounded.lg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
    },
    title: {
      fontSize: theme.typography.size.title,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
      color: theme.text,
    },
    subtitle: {
      fontSize: theme.typography.size.bodyL,
      textAlign: "center",
      marginTop: theme.spacing.sm,
      color: theme.textSecondary,
    },
    code: {
      fontSize: theme.typography.size.bodyS,
      textAlign: "center",
      marginTop: theme.spacing.sm,
      color: theme.textSecondary,
    },
    spacer: { height: theme.spacing.lg },
    buttonSpacing: { marginTop: theme.spacing.sm },
    buttonSpacingNone: { marginTop: 0 },
  });

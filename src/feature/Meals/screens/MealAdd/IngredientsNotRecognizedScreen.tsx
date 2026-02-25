import { useMemo, useState, useEffect } from "react";
import { View, StyleSheet, Text, Image } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import {
  PrimaryButton,
  SecondaryButton,
  ErrorButton,
  Layout,
} from "@/components";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";

const MAX_ATTEMPTS = 3;

export default function IngredientsNotRecognizedScreen({
  navigation,
  flow,
  params,
}: MealAddScreenProps<"IngredientsNotRecognized">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("meals");
  const { clearMeal } = useMealDraftContext();
  const { uid } = useAuthContext();

  const image = params?.image;
  const id = params?.id;
  const attempt = params?.attempt ?? 1;
  const reason = params?.reason ?? "not_recognized";
  const isAiUnavailable = reason === "ai_unavailable";

  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [image]);

  const handleRetake = () => {
    if (attempt < MAX_ATTEMPTS) {
      flow.goTo("MealCamera", {
        id,
        attempt: attempt + 1,
        returnTo: "IngredientsNotRecognized",
      });
    } else {
      navigation.replace("AddMeal", {
        start: "ReviewIngredients",
        id,
        image,
      });
    }
  };

  const handleManualEntry = () => {
    flow.replace("ReviewIngredients", {});
  };

  const handleOpenProductDatabase = () => {
    navigation.replace("SavedMeals");
  };

  const handleOtherMethod = () => {
    if (uid) clearMeal(uid);
    navigation.replace("MealAddMethod");
  };

  const handleCancel = () => {
    flow.goBack();
  };

  return (
    <Layout>
      <View style={styles.container}>
        {image && !imgError ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.image} />
        )}
        <Text style={styles.title}>
          {isAiUnavailable
            ? t("ai_unavailable_title", "AI analysis is currently unavailable")
            : t("not_recognized_title", "We couldn't recognize the ingredients")}
        </Text>
        <Text style={styles.subtitle}>
          {isAiUnavailable
            ? t(
                "ai_unavailable_sub",
                "We couldn't connect to the AI analysis server. You can enter ingredients manually or use the product database.",
              )
            : attempt < MAX_ATTEMPTS
              ? t("not_recognized_sub", "Try again or select other method")
              : t(
                  "not_recognized_last",
                  "Please add the meal manually or try later.",
                )}
        </Text>
        <View style={styles.spacer} />
        {isAiUnavailable ? (
          <>
            <PrimaryButton
              label={t("ai_unavailable_manual", "Enter ingredients manually")}
              onPress={handleManualEntry}
              style={styles.buttonSpacingNone}
            />
            <SecondaryButton
              label={t("ai_unavailable_product_db", "Use product database")}
              onPress={handleOpenProductDatabase}
              style={styles.buttonSpacing}
            />
          </>
        ) : (
          attempt < MAX_ATTEMPTS && (
            <PrimaryButton
              label={`${t("retake", "Retake photo")} (${attempt}/${MAX_ATTEMPTS})`}
              onPress={handleRetake}
              style={styles.buttonSpacingNone}
            />
          )
        )}
        <SecondaryButton
          label={t("select_method", "Back to method selection")}
          onPress={handleOtherMethod}
          style={styles.buttonSpacing}
        />
        <ErrorButton
          label={t("cancel", "Cancel")}
          onPress={handleCancel}
          style={styles.buttonSpacing}
        />
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
    image: {
      width: "100%",
      maxWidth: 520,
      aspectRatio: 4 / 3,
      height: undefined,
      borderRadius: theme.rounded.lg,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.border,
    },
    title: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
      color: theme.text,
    },
    subtitle: {
      fontSize: theme.typography.size.base,
      textAlign: "center",
      marginTop: theme.spacing.sm,
      color: theme.textSecondary,
    },
    spacer: { height: theme.spacing.lg },
    buttonSpacing: { marginTop: theme.spacing.sm },
    buttonSpacingNone: { marginTop: 0 },
  });

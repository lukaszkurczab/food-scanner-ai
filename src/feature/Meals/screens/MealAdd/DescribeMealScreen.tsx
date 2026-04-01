import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, ErrorBox, Layout, Modal, TextInput } from "@/components";
import { AiCreditsBadge } from "@/components/AiCreditsBadge";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { useMealTextAiState } from "@/feature/Meals/hooks/useMealTextAiState";
import {
  MealAddPhotoScaffold,
  MealAddTextLink,
} from "@/feature/Meals/components/MealAddPhotoScaffold";
import { useTheme } from "@/theme/useTheme";

const TEXT_PREVIEW_HEIGHT = 441;

export default function DescribeMealScreen({
  navigation,
  flow,
  params,
}: MealAddScreenProps<"DescribeMeal">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation(["meals", "chat", "common"]);
  const previewTopInset = useMemo(
    () =>
      Math.max(
        theme.spacing.xxl,
        Math.round(insets.top * 0.65) + theme.spacing.xs,
      ),
    [insets.top, theme.spacing.xs, theme.spacing.xxl],
  );

  const {
    name,
    quickDescription,
    loading,
    showLimitModal,
    creditsUsed,
    descriptionError,
    submitError,
    analyzeDisabled,
    creditAllocation,
    onNameChange,
    onQuickDescriptionChange,
    onAnalyze,
    closeLimitModal,
    openPaywall,
  } = useMealTextAiState({
    t,
    language: i18n.language,
    flow,
    initialValues: params,
  });

  return (
    <Layout showNavigation={false} disableScroll style={styles.layout}>
      <View style={styles.fill}>
        <MealAddPhotoScaffold
          topInset={previewTopInset}
          previewHeight={TEXT_PREVIEW_HEIGHT}
          preview={
            <View style={styles.preview}>
              <TextInput
                label={t("meal_name", { ns: "meals" })}
                value={name}
                onChangeText={onNameChange}
                placeholder={t("describe_meal_name_placeholder", {
                  ns: "meals",
                })}
                autoCorrect={false}
                spellCheck={false}
                maxLength={80}
              />
              <TextInput
                label={t("describe_meal_quick_description_label", {
                  ns: "meals",
                })}
                value={quickDescription}
                onChangeText={onQuickDescriptionChange}
                placeholder={t("describe_meal_quick_description_placeholder", {
                  ns: "meals",
                })}
                multiline
                numberOfLines={10}
                autoCapitalize="sentences"
                autoCorrect={false}
                spellCheck={false}
                maxLength={300}
              />
            </View>
          }
          eyebrow={t("describe_meal_sheet_overline", { ns: "meals" })}
          title={t("describe_meal_sheet_title", { ns: "meals" })}
          description={t("describe_meal_sheet_subtitle", { ns: "meals" })}
          accessory={
            <AiCreditsBadge
              text={`✦ ${String(t("credits.costSingle", { ns: "chat" }))}`}
              tone="success"
            />
          }
          content={
            <>
              {descriptionError || submitError ? (
                <ErrorBox message={descriptionError ?? submitError ?? ""} />
              ) : null}
              <Button
                label={t("describe_meal_primary_cta", { ns: "meals" })}
                onPress={onAnalyze}
                disabled={analyzeDisabled}
                loading={loading}
                style={styles.primaryButton}
              />
              <MealAddTextLink
                label={t("change_method", { ns: "meals" })}
                onPress={() =>
                  navigation.navigate("MealAddMethod", {
                    selectionMode: "temporary",
                    origin: "mealAddFlow",
                  })
                }
                disabled={loading}
              />
            </>
          }
        />
      </View>

      <Modal
        visible={showLimitModal}
        title={t("limit.reachedTitle", { ns: "chat" })}
        message={t("limit.reachedShort", {
          ns: "chat",
          used: creditsUsed,
          limit: creditAllocation,
        })}
        primaryAction={{
          label: t("limit.upgradeCta", { ns: "chat" }),
          onPress: openPaywall,
        }}
        secondaryAction={{
          label: t("cancel", { ns: "common" }),
          onPress: closeLimitModal,
        }}
        onClose={closeLimitModal}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    layout: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    },
    fill: {
      flex: 1,
      backgroundColor: theme.surface,
    },
    preview: {
      flex: 1,
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 24,
      gap: theme.spacing.md,
    },
    previewNameField: {
      marginBottom: 24,
    },
    previewDescriptionField: {
      flex: 1,
    },
    primaryButton: {
      minHeight: 48,
      borderRadius: theme.rounded.sm,
    },
  });

import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AiCreditsBadge } from "@/components/AiCreditsBadge";
import { LongTextInput } from "@/components/LongTextInput";
import { TextInput as ShortInput } from "@/components/TextInput";
import { Button, Layout, Modal, NumberInput, ErrorBox } from "@/components";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { useMealTextAiState } from "@/feature/Meals/hooks/useMealTextAiState";
import { useTheme } from "@/theme/useTheme";

export default function DescribeMealScreen({
  navigation,
  flow,
  params,
}: MealAddScreenProps<"DescribeMeal">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation(["meals", "chat", "common"]);

  const {
    name,
    ingPreview,
    amount,
    desc,
    loading,
    retries,
    showLimitModal,
    creditsUsed,
    nameError,
    amountError,
    ingredientsError,
    submitError,
    analyzeDisabled,
    creditAllocation,
    onNameChange,
    onIngredientsChange,
    onAmountChange,
    onDescChange,
    onNameBlur,
    onAmountBlur,
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
    <Layout showNavigation={false} disableScroll>
      <View style={styles.content}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.eyebrow}>
                {t("describe_meal_eyebrow", {
                  ns: "meals",
                  defaultValue: "Text meal",
                })}
              </Text>
              <Text style={styles.title}>{t("aiTextTitle", { ns: "meals" })}</Text>
              <Text style={styles.subtitle}>
                {t("describe_meal_subtitle", {
                  ns: "meals",
                  defaultValue:
                    "Write a quick description and we'll turn it into a meal draft for review.",
                })}
              </Text>
            </View>

            <View style={styles.badgeRow}>
              <AiCreditsBadge text={t("credits.costSingle", { ns: "chat" })} />
            </View>
          </View>

          <View style={styles.primaryCard}>
            <ShortInput
              label={t("meal_name", { ns: "meals" })}
              value={name}
              onChangeText={onNameChange}
              placeholder={t("describe_meal_name_placeholder", {
                ns: "meals",
                defaultValue: "Chicken rice bowl",
              })}
              onBlur={onNameBlur}
              error={nameError}
              inputStyle={styles.input}
              disabled={loading}
            />
            <LongTextInput
              label={t("ingredients_optional", { ns: "meals" })}
              value={ingPreview}
              onChangeText={onIngredientsChange}
              placeholder={t("describe_meal_ingredients_placeholder", {
                ns: "meals",
                defaultValue:
                  "Grilled chicken, jasmine rice, cucumber, yogurt sauce",
              })}
              inputStyle={styles.input}
              numberOfLines={5}
              error={ingredientsError}
              disabled={loading}
            />

            <Text style={styles.helperText}>
              {t("describe_meal_helper", {
                ns: "meals",
                defaultValue:
                  "A short ingredient list is enough. Add optional details only if they matter.",
              })}
            </Text>
          </View>

          <View style={styles.optionalCard}>
            <Text style={styles.optionalTitle}>
              {t("describe_meal_optional_title", {
                ns: "meals",
                defaultValue: "Optional details",
              })}
            </Text>

            <View style={styles.optionalFields}>
              <NumberInput
                label={t("amount", { ns: "meals" })}
                value={amount}
                onChangeText={onAmountChange}
                placeholder={t("amount", { ns: "meals" })}
                maxDecimals={1}
                allowEmptyOnBlur
                onBlur={onAmountBlur}
                error={amountError}
                inputStyle={styles.input}
                disabled={loading}
              />
              <LongTextInput
                label={t("description_optional", { ns: "meals" })}
                value={desc}
                onChangeText={onDescChange}
                placeholder={t("describe_meal_description_placeholder", {
                  ns: "meals",
                  defaultValue: "Homemade, lightly spicy, cooked with olive oil",
                })}
                numberOfLines={6}
                inputStyle={styles.input}
                disabled={loading}
              />
            </View>
          </View>

          <ErrorBox message={submitError ?? ""} />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={
              retries > 0
                ? `${t("analyze", { ns: "meals" })} (${retries}/3)`
                : t("analyze", { ns: "meals" })
            }
            onPress={onAnalyze}
            loading={loading}
            disabled={analyzeDisabled}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("change_method", { ns: "meals" })}
            disabled={loading}
            onPress={() =>
              navigation.navigate("MealAddMethod", {
                selectionMode: "temporary",
              })
            }
            style={({ pressed }) => [
              styles.secondaryAction,
              loading ? styles.secondaryActionDisabled : null,
              pressed && !loading ? styles.secondaryActionPressed : null,
            ]}
          >
            <Text style={styles.secondaryActionLabel}>
              {t("change_method", { ns: "meals" })}
            </Text>
          </Pressable>
        </View>
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
    content: {
      flex: 1,
      gap: theme.spacing.md,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    heroCard: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      borderRadius: theme.rounded.xl,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      backgroundColor: theme.surfaceElevated,
    },
    heroHeader: {
      gap: theme.spacing.xs,
    },
    eyebrow: {
      color: theme.primary,
      fontSize: theme.typography.size.labelS,
      lineHeight: theme.typography.lineHeight.labelS,
      fontFamily: theme.typography.fontFamily.medium,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      maxWidth: 360,
    },
    badgeRow: {
      alignItems: "flex-start",
    },
    primaryCard: {
      borderRadius: theme.rounded.xl,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      backgroundColor: theme.surfaceElevated,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    helperText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    optionalCard: {
      borderRadius: theme.rounded.xl,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      backgroundColor: theme.surface,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    optionalTitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.labelS,
      lineHeight: theme.typography.lineHeight.labelS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    optionalFields: {
      gap: theme.spacing.md,
    },
    input: { fontSize: theme.typography.size.bodyM },
    footer: {
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
    },
    secondaryAction: {
      alignSelf: "center",
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    secondaryActionPressed: {
      opacity: 0.72,
    },
    secondaryActionDisabled: {
      opacity: 0.48,
    },
    secondaryActionLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
    },
  });

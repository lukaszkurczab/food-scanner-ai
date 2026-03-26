import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/theme/useTheme";
import type { RootStackParamList } from "@/navigation/navigate";
import type { StackNavigationProp } from "@react-navigation/stack";
import AppIcon from "@/components/AppIcon";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components";
import { Modal } from "@/components/Modal";
import { useMealAddMethodState } from "@/feature/Meals/hooks/useMealAddMethodState";
import { AiCreditsBadge } from "@/components/AiCreditsBadge";
import { trackMealAddMethodSelected } from "@/services/telemetry/telemetryInstrumentation";

type MealAddMethodNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MealAddMethod"
>;

const MealAddMethodScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<MealAddMethodNavigationProp>();
  const { t } = useTranslation(["meals", "chat"]);

  const state = useMealAddMethodState({ navigation });

  const optionCost = (key: string): number => {
    if (key === "ai_photo") return 5;
    if (key === "ai_text") return 1;
    return 0;
  };

  const buildCostLabel = (cost: number): string => {
    if (cost === 0) return t("credits.costZero", { ns: "chat" });
    if (cost === 1) return t("credits.costSingle", { ns: "chat" });
    return t("credits.costMultiple", { ns: "chat", count: cost });
  };

  return (
    <Layout>
      <Text style={styles.title}>{t("title")}</Text>
      <Text style={styles.subtitle}>{t("subtitle")}</Text>

      <View style={styles.optionsWrap}>
        {state.options.map((option) => {
          const cost = optionCost(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              testID={`meal-add-option-${option.key}`}
              activeOpacity={0.85}
              style={styles.optionCard}
              onPress={() => {
                void trackMealAddMethodSelected(option.key);
                void state.handleOptionPress(option);
              }}
            >
              <View style={styles.optionIconBox}>
                <AppIcon
                  name={option.icon}
                  size={48}
                  color={theme.primary}
                />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <Text style={styles.optionTitle}>{t(option.titleKey)}</Text>
                  <AiCreditsBadge
                    text={buildCostLabel(cost)}
                    tone={cost > 0 ? "accent" : "neutral"}
                  />
                </View>
                <Text style={styles.optionDescription}>
                  {t(option.descKey)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={state.showResumeModal}
        title={t("continue_draft_title")}
        message={t("continue_draft_message")}
        primaryAction={{
          label: t("continue"),
          onPress: state.handleContinueDraft,
        }}
        secondaryAction={{
          label: t("discard"),
          onPress: state.handleDiscardDraft,
          tone: "destructive",
        }}
        onClose={state.closeResumeModal}
      />

      <Modal
        visible={state.showAiLimitModal}
        title={t("limit.reachedTitle", {
          ns: "chat",
          defaultValue: "Daily limit reached",
        })}
        message={t("limit.reachedShort", { ns: "chat" })}
        primaryAction={{
          label: t("limit.upgradeCta", {
            ns: "chat",
            defaultValue: "Upgrade",
          }),
          onPress: state.handleAiLimitUpgrade,
        }}
        secondaryAction={{
          label: t("cancel", {
            ns: "common",
            defaultValue: "Close",
          }),
          onPress: state.closeAiLimitModal,
        }}
        onClose={state.closeAiLimitModal}
        stackActions
      />
    </Layout>
  );
};

export default MealAddMethodScreen;

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    title: {
      fontSize: theme.typography.size.h1,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      fontSize: theme.typography.size.bodyM,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.xl,
    },
    optionsWrap: {
      flexGrow: 1,
      justifyContent: "flex-start",
      gap: theme.spacing.xl,
    },
    optionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surfaceElevated,
      borderRadius: theme.rounded.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 12,
    },
    optionIconBox: {
      width: 64,
      height: 64,
      borderRadius: theme.rounded.sm,
      marginRight: theme.spacing.lg,
      justifyContent: "center",
      alignItems: "center",
    },
    optionContent: { flex: 1 },
    optionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    optionTitle: {
      fontSize: theme.typography.size.title,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      flexShrink: 1,
    },
    optionDescription: {
      fontSize: theme.typography.size.bodyL,
      color: theme.textSecondary,
      opacity: 0.95,
    },
  });

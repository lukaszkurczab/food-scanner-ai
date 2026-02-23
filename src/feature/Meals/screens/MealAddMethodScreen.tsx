import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/theme/useTheme";
import type { RootStackParamList } from "@/navigation/navigate";
import type { StackNavigationProp } from "@react-navigation/stack";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing, rounded } from "@/theme";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components";
import { Modal } from "@/components/Modal";
import { useMealAddMethodState } from "@/feature/Meals/hooks/useMealAddMethodState";

type MealAddMethodNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MealAddMethod"
>;

const MealAddMethodScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<MealAddMethodNavigationProp>();
  const { t } = useTranslation("meals");

  const state = useMealAddMethodState({ navigation });

  return (
    <Layout>
      <Text
        style={{
          fontSize: theme.typography.size.xxl,
          fontWeight: "bold",
          color: theme.text,
          textAlign: "center",
          marginBottom: spacing.md,
        }}
      >
        {t("title")}
      </Text>
      <Text
        style={{
          fontSize: theme.typography.size.md,
          color: theme.textSecondary,
          textAlign: "center",
          marginBottom: spacing.xl,
        }}
      >
        {t("subtitle")}
      </Text>

      <View style={[styles.optionsWrap, { gap: spacing.xl }]}>
        {state.options.map((option) => (
          <TouchableOpacity
            key={option.key}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.card,
              borderRadius: rounded.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderWidth: 1.5,
              borderColor: theme.border,
              shadowColor: theme.shadow,
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 12,
            }}
            onPress={() => void state.handleOptionPress(option)}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: rounded.sm,
                marginRight: spacing.lg,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons
                name={option.icon}
                size={48}
                color={theme.accentSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: theme.typography.size.lg,
                  fontWeight: "bold",
                  color: theme.text,
                  marginBottom: 4,
                }}
              >
                {t(option.titleKey)}
              </Text>
              <Text
                style={{
                  fontSize: theme.typography.size.base,
                  color: theme.textSecondary,
                  opacity: 0.95,
                }}
              >
                {t(option.descKey)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={state.showResumeModal}
        title={t("continue_draft_title")}
        message={t("continue_draft_message")}
        primaryActionLabel={t("continue")}
        onPrimaryAction={state.handleContinueDraft}
        secondaryActionLabel={t("discard")}
        onSecondaryAction={state.handleDiscardDraft}
        onClose={state.closeResumeModal}
      />

      <Modal
        visible={state.showAiLimitModal}
        title={t("limit.reachedTitle", {
          ns: "chat",
          defaultValue: "Daily limit reached",
        })}
        message={t("limit.reachedShort", { ns: "chat" })}
        primaryActionLabel={t("limit.upgradeCta", {
          ns: "chat",
          defaultValue: "Upgrade",
        })}
        onPrimaryAction={state.handleAiLimitUpgrade}
        secondaryActionLabel={t("cancel", {
          ns: "common",
          defaultValue: "Close",
        })}
        onSecondaryAction={state.closeAiLimitModal}
        onClose={state.closeAiLimitModal}
        stackActions
      />
    </Layout>
  );
};

export default MealAddMethodScreen;

const styles = StyleSheet.create({
  optionsWrap: { flexGrow: 1, justifyContent: "flex-start" },
});

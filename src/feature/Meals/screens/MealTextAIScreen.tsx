import { View, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme } from "@/theme/useTheme";
import {
  Layout,
  PrimaryButton,
  SecondaryButton,
  Modal,
} from "@/components";
import { useTranslation } from "react-i18next";
import { useNavigation, type ParamListBase } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { LongTextInput } from "@/components/LongTextInput";
import { TextInput as ShortInput } from "@/components/TextInput";
import { useMealTextAiState } from "@/feature/Meals/hooks/useMealTextAiState";

export default function MealTextAIScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation(["meals", "chat", "common"]);
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();

  const {
    name,
    ingPreview,
    amount,
    desc,
    loading,
    retries,
    showLimitModal,
    nameError,
    amountError,
    ingredientsError,
    analyzeDisabled,
    featureLimit,
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
  });

  return (
    <Layout>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            gap: theme.spacing.lg,
            flex: 1,
          }}
        >
          <View style={{ gap: theme.spacing.md, flexGrow: 1 }}>
            <ShortInput
              label={t("meal_name", { ns: "meals" })}
              value={name}
              onChangeText={onNameChange}
              placeholder={t("meal_name", { ns: "meals" })}
              onBlur={onNameBlur}
              error={nameError}
              inputStyle={{ fontSize: theme.typography.size.md }}
            />
            <LongTextInput
              label={t("ingredients_optional", { ns: "meals" })}
              value={ingPreview}
              onChangeText={onIngredientsChange}
              placeholder={t("ingredients_optional", { ns: "meals" })}
              inputStyle={{ fontSize: theme.typography.size.md }}
              numberOfLines={5}
              error={ingredientsError}
            />
            <ShortInput
              label={t("amount", { ns: "meals" })}
              value={amount}
              onChangeText={onAmountChange}
              placeholder={t("amount", { ns: "meals" })}
              keyboardType="numeric"
              onBlur={onAmountBlur}
              error={amountError}
              inputStyle={{ fontSize: theme.typography.size.md }}
            />
            <LongTextInput
              label={t("description_optional", { ns: "meals" })}
              value={desc}
              onChangeText={onDescChange}
              placeholder={t("description_optional", { ns: "meals" })}
              numberOfLines={6}
              inputStyle={{ fontSize: theme.typography.size.md }}
            />
          </View>
          <View style={{ gap: theme.spacing.sm, marginTop: "auto" }}>
            <PrimaryButton
              label={
                retries > 0
                  ? `${t("analyze", { ns: "meals" })} (${retries}/3)`
                  : t("analyze", { ns: "meals" })
              }
              loading={loading}
              onPress={onAnalyze}
              disabled={analyzeDisabled}
              style={{ marginTop: theme.spacing.sm }}
            />
            <SecondaryButton
              label={t("select_method", { ns: "meals" })}
              onPress={() => navigation.navigate("MealAddMethod")}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      <Modal
        visible={showLimitModal}
        title={t("limit.reachedTitle", { ns: "chat" })}
        message={t("limit.reachedShort", {
          ns: "chat",
          used: 1,
          limit: featureLimit,
        })}
        primaryActionLabel={t("limit.upgradeCta", { ns: "chat" })}
        onPrimaryAction={openPaywall}
        secondaryActionLabel={t("cancel", { ns: "common" })}
        onSecondaryAction={closeLimitModal}
        onClose={closeLimitModal}
      />
    </Layout>
  );
}

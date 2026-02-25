import { useMemo } from "react";
import { View, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import {
  Layout,
  NumberInput,
  PrimaryButton,
  SecondaryButton,
  Modal,
} from "@/components";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { LongTextInput } from "@/components/LongTextInput";
import { TextInput as ShortInput } from "@/components/TextInput";
import { useMealTextAiState } from "@/feature/Meals/hooks/useMealTextAiState";
import type { RootStackParamList } from "@/navigation/navigate";

export default function MealTextAIScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation(["meals", "chat", "common"]);
  const navigation = useNavigation<
    StackNavigationProp<RootStackParamList, "MealTextAI">
  >();

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
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.form}>
            <ShortInput
              label={t("meal_name", { ns: "meals" })}
              value={name}
              onChangeText={onNameChange}
              placeholder={t("meal_name", { ns: "meals" })}
              onBlur={onNameBlur}
              error={nameError}
              inputStyle={styles.input}
            />
            <LongTextInput
              label={t("ingredients_optional", { ns: "meals" })}
              value={ingPreview}
              onChangeText={onIngredientsChange}
              placeholder={t("ingredients_optional", { ns: "meals" })}
              inputStyle={styles.input}
              numberOfLines={5}
              error={ingredientsError}
            />
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
            />
            <LongTextInput
              label={t("description_optional", { ns: "meals" })}
              value={desc}
              onChangeText={onDescChange}
              placeholder={t("description_optional", { ns: "meals" })}
              numberOfLines={6}
              inputStyle={styles.input}
            />
          </View>
          <View style={styles.actions}>
            <PrimaryButton
              label={
                retries > 0
                  ? `${t("analyze", { ns: "meals" })} (${retries}/3)`
                  : t("analyze", { ns: "meals" })
              }
              loading={loading}
              onPress={onAnalyze}
              disabled={analyzeDisabled}
              style={styles.actionSpacing}
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

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { gap: theme.spacing.lg, flex: 1 },
    form: { gap: theme.spacing.md, flexGrow: 1 },
    input: { fontSize: theme.typography.size.md },
    actions: { gap: theme.spacing.sm, marginTop: "auto" },
    actionSpacing: { marginTop: theme.spacing.sm },
  });

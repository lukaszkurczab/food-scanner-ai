import { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "@/theme/useTheme";
import {
  Layout,
  NumberInput,
  Modal,
  ErrorBox,
} from "@/components";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { LongTextInput } from "@/components/LongTextInput";
import { TextInput as ShortInput } from "@/components/TextInput";
import { useMealTextAiState } from "@/feature/Meals/hooks/useMealTextAiState";
import type { RootStackParamList } from "@/navigation/navigate";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";

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
    limitUsed,
    nameError,
    amountError,
    ingredientsError,
    submitError,
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
    <Layout disableScroll>
      <View style={styles.content}>
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ShortInput
            label={t("meal_name", { ns: "meals" })}
            value={name}
            onChangeText={onNameChange}
            placeholder={t("meal_name", { ns: "meals" })}
            onBlur={onNameBlur}
            error={nameError}
            inputStyle={styles.input}
            disabled={loading}
          />
          <LongTextInput
            label={t("ingredients_optional", { ns: "meals" })}
            value={ingPreview}
            onChangeText={onIngredientsChange}
            placeholder={t("ingredients_optional", { ns: "meals" })}
            inputStyle={styles.input}
            numberOfLines={5}
            error={ingredientsError}
            disabled={loading}
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
            disabled={loading}
          />
          <LongTextInput
            label={t("description_optional", { ns: "meals" })}
            value={desc}
            onChangeText={onDescChange}
            placeholder={t("description_optional", { ns: "meals" })}
            numberOfLines={6}
            inputStyle={styles.input}
            disabled={loading}
          />
        </ScrollView>
        <ErrorBox message={submitError ?? ""} />
        <View style={styles.actions}>
          <GlobalActionButtons
            label={
              retries > 0
                ? `${t("analyze", { ns: "meals" })} (${retries}/3)`
                : t("analyze", { ns: "meals" })
            }
            onPress={onAnalyze}
            primaryLoading={loading}
            primaryDisabled={analyzeDisabled}
            secondaryLabel={t("select_method", { ns: "meals" })}
            secondaryOnPress={() => navigation.navigate("MealAddMethod")}
            secondaryDisabled={loading}
          />
        </View>
      </View>
      <Modal
        visible={showLimitModal}
        title={t("limit.reachedTitle", { ns: "chat" })}
        message={t("limit.reachedShort", {
          ns: "chat",
          used: limitUsed,
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
    content: { gap: theme.spacing.lg, flex: 1 },
    formScroll: { flex: 1 },
    form: { gap: theme.spacing.md, paddingBottom: theme.spacing.sm },
    input: { fontSize: theme.typography.size.md },
    actions: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  });

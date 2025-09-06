import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Layout, PrimaryButton, SecondaryButton, Modal } from "@/components";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext";
import { usePremiumContext } from "@/context/PremiumContext";
import { useNavigation } from "@react-navigation/native";
import { canUseAiTodayFor, consumeAiUseFor } from "@/services/userService";
import { extractIngredientsFromText } from "@/services/textMealService";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { v4 as uuidv4 } from "uuid";
import { LongTextInput } from "@/components/LongTextInput";
import { TextInput as ShortInput } from "@/components/TextInput";
import type { Ingredient, Meal } from "@/types";

export default function MealTextAIScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation(["meals", "chat", "common"]);
  const { uid } = useAuthContext();
  const { isPremium } = usePremiumContext();
  const navigation = useNavigation<any>();
  const { meal, setMeal, saveDraft, setLastScreen } = useMealDraftContext();

  const [name, setName] = useState("");
  const [ingPreview, setIngPreview] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<{ name: boolean; amount: boolean }>({
    name: false,
    amount: false,
  });
  const [showLimitModal, setShowLimitModal] = useState(false);

  const FEATURE_LIMIT = 1;

  const sanitizeAmount = (s: string) => String(s).replace(/[^0-9.]/g, "");
  const amountRaw = useMemo(() => sanitizeAmount(amount), [amount]);
  const amountNum = useMemo(() => Number(amountRaw), [amountRaw]);

  const nameError: string | undefined = useMemo(() => {
    if (!touched.name) return undefined;
    if (!name.trim()) return t("ingredient_name_required", { ns: "meals" });
    return undefined;
  }, [touched.name, name, t]);

  const amountError: string | undefined = useMemo(() => {
    if (!touched.amount) return undefined;
    if (amountRaw.length === 0) return undefined;
    if (!isFinite(amountNum) || amountNum <= 0)
      return t("ingredient_invalid_values", { ns: "meals" });
    return undefined;
  }, [touched.amount, amountRaw, amountNum, t]);

  const buildInitialMeal = useCallback(
    (u: string): Meal =>
      ({
        mealId: uuidv4(),
        userUid: u,
        name: null,
        photoUrl: null,
        ingredients: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncState: "pending",
        tags: [],
        deleted: false,
        notes: null,
        type: "other",
        timestamp: "",
        source: "ai",
        cloudId: undefined,
      } as unknown as Meal),
    []
  );

  const ensureDraft = useCallback(async (): Promise<Meal | null> => {
    if (!uid) return null;
    if (meal) return meal;
    const base = buildInitialMeal(uid);
    setMeal(base);
    await saveDraft(uid);
    return base;
  }, [uid, meal, buildInitialMeal, saveDraft, setMeal]);

  const fillDraftAndGo = useCallback(
    async (ings: Ingredient[]) => {
      if (!uid) return;
      const base = (await ensureDraft()) as Meal;
      const next: Meal = {
        ...base,
        name: name.trim() || base.name,
        notes: desc.trim() || base.notes || null,
        ingredients: ings,
        updatedAt: new Date().toISOString(),
      };
      setMeal(next);
      await saveDraft(uid);
      await setLastScreen(uid, "ReviewIngredients");
      navigation.replace("ReviewIngredients");
    },
    [
      ensureDraft,
      navigation,
      saveDraft,
      setLastScreen,
      setMeal,
      uid,
      name,
      desc,
    ]
  );

  const buildDescription = () => {
    const parts: string[] = [];
    if (name.trim()) parts.push(`Meal: ${name.trim()}`);
    const amt = Number(String(amount).replace(/[^0-9.]/g, ""));
    if (isFinite(amt) && amt > 0) parts.push(`Total amount: ${amt} g`);
    if (ingPreview.trim()) parts.push(`Ingredients: ${ingPreview.trim()}`);
    if (desc.trim()) parts.push(`Notes: ${desc.trim()}`);
    return parts.join(" | ");
  };

  const onAnalyze = useCallback(async () => {
    if (!uid) return;
    const missingName = !name.trim();
    const amountProvided = sanitizeAmount(amount).length > 0;
    const invalidAmount =
      amountProvided &&
      (!isFinite(Number(sanitizeAmount(amount))) ||
        Number(sanitizeAmount(amount)) <= 0);
    if (missingName || invalidAmount) {
      setTouched((prev) => ({
        name: true,
        amount: prev.amount || amountProvided,
      }));
      return;
    }

    // per-feature limit: "text"
    const allowed = await canUseAiTodayFor(
      uid,
      !!isPremium,
      "text",
      FEATURE_LIMIT
    );
    if (!allowed) {
      setShowLimitModal(true);
      return;
    }

    try {
      setLoading(true);
      const description = buildDescription();
      const ings = await extractIngredientsFromText(uid, description, {
        isPremium: !!isPremium,
        limit: FEATURE_LIMIT,
        lang: i18n.language || "en",
      });
      if (!ings || ings.length === 0) {
        navigation.replace("IngredientsNotRecognized");
        return;
      }
      // consume usage on success
      await consumeAiUseFor(uid, !!isPremium, "text", FEATURE_LIMIT);
      await fillDraftAndGo(ings);
    } catch {
      Alert.alert(t("default_error", { ns: "common" }));
    } finally {
      setLoading(false);
    }
  }, [
    uid,
    isPremium,
    t,
    fillDraftAndGo,
    navigation,
    name,
    amount,
    i18n.language,
  ]);

  return (
    <Layout>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            padding: theme.spacing.container,
            gap: theme.spacing.lg,
            flex: 1,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: theme.rounded.lg,
              padding: theme.spacing.lg,
              gap: theme.spacing.md,
              shadowColor: theme.shadow,
              shadowOpacity: 0.08,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 10,
              flex: 1,
            }}
          >
            <View style={{ gap: theme.spacing.md, flexGrow: 1 }}>
              <ShortInput
                label={t("ingredient_name", {
                  ns: "meals",
                  defaultValue: "Meal name",
                })}
                value={name}
                onChangeText={setName}
                placeholder={t("ingredient_name", {
                  ns: "meals",
                  defaultValue: "Meal name",
                })}
                onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                error={nameError}
                inputStyle={{ fontSize: theme.typography.size.md }}
              />
              <LongTextInput
                label={t("ingredients_optional", {
                  ns: "meals",
                  defaultValue: "Ingredients (optional)",
                })}
                value={ingPreview}
                onChangeText={setIngPreview}
                placeholder={t("ingredients_optional", {
                  ns: "meals",
                  defaultValue: "Ingredients (optional)",
                })}
                inputStyle={{ fontSize: theme.typography.size.md }}
                numberOfLines={5}
              />
              <ShortInput
                label={t("amount", { ns: "meals", defaultValue: "Amount [g]" })}
                value={amount}
                onChangeText={setAmount}
                placeholder={t("amount", {
                  ns: "meals",
                  defaultValue: "Amount [g]",
                })}
                keyboardType="numeric"
                onBlur={() => setTouched((p) => ({ ...p, amount: true }))}
                error={amountError}
                inputStyle={{ fontSize: theme.typography.size.md }}
              />
              <LongTextInput
                label={t("description_optional", {
                  ns: "meals",
                  defaultValue: "Description (optional)",
                })}
                value={desc}
                onChangeText={setDesc}
                placeholder={t("description_optional", {
                  ns: "meals",
                  defaultValue: "Description (optional)",
                })}
                numberOfLines={6}
                inputStyle={{ fontSize: theme.typography.size.md }}
              />
            </View>
            <View style={{ gap: theme.spacing.sm, marginTop: "auto" }}>
              <PrimaryButton
                label={
                  loading
                    ? t("loading", { ns: "common" })
                    : t("analyze", { ns: "meals", defaultValue: "Analyze" })
                }
                onPress={onAnalyze}
                disabled={
                  loading ||
                  !name.trim() ||
                  (amountRaw.length > 0 &&
                    (!isFinite(amountNum) || amountNum <= 0))
                }
                style={{ marginTop: theme.spacing.sm }}
              />
              <SecondaryButton
                label={t("select_method", {
                  ns: "meals",
                  defaultValue: "Select other method",
                })}
                onPress={() => navigation.navigate("MealAddMethod")}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Modal
        visible={showLimitModal}
        title={t("limit.reachedTitle", {
          ns: "chat",
          defaultValue: "Daily limit reached",
        })}
        message={t("limit.reachedShort", {
          ns: "chat",
          used: 1,
          limit: FEATURE_LIMIT,
        })}
        primaryActionLabel={t("limit.upgradeCta", {
          ns: "chat",
          defaultValue: "Upgrade",
        })}
        onPrimaryAction={() => {
          setShowLimitModal(false);
          navigation.navigate("ManageSubscription" as any);
        }}
        secondaryActionLabel={t("cancel", {
          ns: "common",
          defaultValue: "Close",
        })}
        onSecondaryAction={() => setShowLimitModal(false)}
        onClose={() => setShowLimitModal(false)}
      />
    </Layout>
  );
}

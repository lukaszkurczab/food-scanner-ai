// src/feature/Meals/screens/MealTextAIScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Layout, PrimaryButton, SecondaryButton } from "@/components";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext";
import { usePremiumContext } from "@/context/PremiumContext";
import { useNavigation } from "@react-navigation/native";
import { canUseAiToday } from "@/services/userService";
import { extractIngredientsFromText } from "@/services/textMealService";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { v4 as uuidv4 } from "uuid";
import { LongTextInput } from "@/components/LongTextInput";
import { TextInput as ShortInput } from "@/components/TextInput";
import type { Ingredient, Meal } from "@/types";

export default function MealTextAIScreen() {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "chat", "common"]);
  const { uid } = useAuthContext();
  const { isPremium } = usePremiumContext();
  const navigation = useNavigation<any>();
  const { meal, setMeal, saveDraft, setLastScreen } = useMealDraftContext();

  const [name, setName] = useState("");
  const [ingPreview, setIngPreview] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const dailyLimit = 1;

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t("ingredient_name_required", { ns: "meals" });
    const amt = Number(String(amount).replace(/[^0-9.]/g, ""));
    if (!isFinite(amt) || amt <= 0)
      e.amount = t("ingredient_invalid_values", { ns: "meals" });
    return e;
  }, [name, amount, t]);

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
    if (Object.keys(errors).length) return;
    const allowed = await canUseAiToday(uid, !!isPremium, dailyLimit);
    if (!allowed) {
      Alert.alert(
        t("limit.reachedShort", { ns: "chat", used: 1, limit: dailyLimit })
      );
      return;
    }
    try {
      setLoading(true);
      const description = buildDescription();
      const ings = await extractIngredientsFromText(uid, description, {
        isPremium: !!isPremium,
        limit: dailyLimit,
      });
      if (!ings || ings.length === 0) {
        navigation.replace("IngredientsNotRecognized");
        return;
      }
      await fillDraftAndGo(ings);
    } catch {
      Alert.alert(t("default_error", { ns: "common" }));
    } finally {
      setLoading(false);
    }
  }, [uid, errors, isPremium, t, fillDraftAndGo, navigation]);

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
          <View style={{ alignItems: "center", gap: theme.spacing.xs }}>
            <Text
              style={{
                fontSize: theme.typography.size.md,
                color: theme.textSecondary,
                textAlign: "center",
              }}
            >
              {t("aiTextDesc", { ns: "meals" })}
            </Text>
          </View>

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
            }}
          >
            <ShortInput
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Meal name"
              error={errors.name}
            />
            <LongTextInput
              label="Ingredients (optional)"
              value={ingPreview}
              onChangeText={setIngPreview}
              placeholder="List of sample ingredients"
              numberOfLines={3}
            />
            <ShortInput
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="Total amount [g]"
              keyboardType="numeric"
              error={errors.amount}
            />
            <LongTextInput
              label="Description (optional)"
              value={desc}
              onChangeText={setDesc}
              placeholder="Describe meal"
              numberOfLines={4}
            />

            <PrimaryButton
              label={loading ? t("loading", { ns: "common" }) : "Analyze"}
              onPress={onAnalyze}
              disabled={loading || Object.keys(errors).length > 0}
              style={{ marginTop: theme.spacing.sm }}
            />
            <SecondaryButton
              label="Select other method"
              onPress={() => navigation.navigate("MealAddMethod")}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Layout>
  );
}

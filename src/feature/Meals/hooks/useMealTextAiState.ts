import { useCallback, useMemo, useState } from "react";
import { Keyboard } from "react-native";
import { useNavigation, type ParamListBase } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { v4 as uuidv4 } from "uuid";
import { Toast } from "@/components";
import { useAuthContext } from "@/context/AuthContext";
import { usePremiumContext } from "@/context/PremiumContext";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { canUseAiTodayFor, consumeAiUseFor } from "@/services/userService";
import { extractIngredientsFromText } from "@/services/textMealService";
import type { Ingredient, Meal } from "@/types";

const FEATURE_LIMIT = 1;
const MAX_RETRIES = 3;

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function useMealTextAiState(params: {
  t: Translate;
  language?: string;
}) {
  const { t, language } = params;
  const { uid } = useAuthContext();
  const { isPremium } = usePremiumContext();
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
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
  const [retries, setRetries] = useState(0);
  const [ingredientsError, setIngredientsError] = useState<string | undefined>();

  const sanitizeAmount = useCallback(
    (value: string) =>
      String(value)
        .replace(/[^0-9.,]/g, "")
        .replace(",", "."),
    [],
  );

  const amountRaw = useMemo(() => sanitizeAmount(amount), [amount, sanitizeAmount]);
  const amountNum = useMemo(() => Number(amountRaw), [amountRaw]);

  const nameError: string | undefined = useMemo(() => {
    if (!touched.name) return undefined;
    if (!name.trim()) {
      return t("meal_name_required", { ns: "meals" });
    }
    return undefined;
  }, [name, t, touched.name]);

  const amountError: string | undefined = useMemo(() => {
    if (!touched.amount) return undefined;
    if (amountRaw.length === 0) return undefined;
    if (!isFinite(amountNum) || amountNum <= 0) {
      return t("ingredient_invalid_values", { ns: "meals" });
    }
    return undefined;
  }, [amountNum, amountRaw, t, touched.amount]);

  const buildInitialMeal = useCallback(
    (userId: string): Meal => ({
      mealId: uuidv4(),
      userUid: userId,
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
    }),
    [],
  );

  const ensureDraft = useCallback(async (): Promise<Meal | null> => {
    if (!uid) return null;
    if (meal) return meal;

    const base = buildInitialMeal(uid);
    setMeal(base);
    await saveDraft(uid);
    return base;
  }, [buildInitialMeal, meal, saveDraft, setMeal, uid]);

  const fillDraftAndGo = useCallback(
    async (ingredients: Ingredient[]) => {
      if (!uid) return;

      const base = await ensureDraft();
      if (!base) return;

      const next: Meal = {
        ...base,
        name: name.trim() || base.name,
        notes: desc.trim() || base.notes || null,
        ingredients,
        updatedAt: new Date().toISOString(),
      };

      setMeal(next);
      await saveDraft(uid);
      await setLastScreen(uid, "ReviewIngredients");
      navigation.replace("ReviewIngredients");
    },
    [desc, ensureDraft, name, navigation, saveDraft, setLastScreen, setMeal, uid],
  );

  const buildDescription = useCallback(() => {
    const parsedAmount = Number(sanitizeAmount(amount));
    const amount_g =
      isFinite(parsedAmount) && parsedAmount > 0
        ? Math.round(parsedAmount)
        : null;
    const ingredientsText = ingPreview.trim();
    const nameText = name.trim();
    const payload = {
      name: nameText || null,
      ingredients: ingredientsText || nameText || null,
      amount_g,
      notes: desc.trim() || null,
      lang: language || "pl",
    };
    return JSON.stringify(payload);
  }, [amount, desc, ingPreview, language, name, sanitizeAmount]);

  const onAnalyze = useCallback(async () => {
    if (!uid) return;

    Keyboard.dismiss();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    setIngredientsError(undefined);

    const missingName = !name.trim();
    const amountProvided = amountRaw.length > 0;
    const invalidAmount =
      amountProvided &&
      (!isFinite(Number(amountRaw)) || Number(amountRaw) <= 0);
    const missingIngredientsAndAmount = !ingPreview.trim() && !amountRaw.length;

    if (missingName) {
      setTouched((prev) => ({ ...prev, name: true }));
      return;
    }

    if (invalidAmount) {
      setTouched((prev) => ({ ...prev, amount: true }));
      return;
    }

    if (missingIngredientsAndAmount) {
      setIngredientsError(
        t("text_ai_require_ingredients_or_amount", { ns: "meals" }),
      );
      return;
    }

    if (retries >= MAX_RETRIES) return;

    const allowed = await canUseAiTodayFor(
      uid,
      !!isPremium,
      "text",
      FEATURE_LIMIT,
    );
    if (!allowed) {
      setShowLimitModal(true);
      return;
    }

    try {
      setLoading(true);
      const description = buildDescription();
      const ingredients = await extractIngredientsFromText(uid, description, {
        isPremium: !!isPremium,
        limit: FEATURE_LIMIT,
        lang: language || "en",
      });

      if (!ingredients || ingredients.length === 0) {
        setRetries((prev) => prev + 1);
        Toast.show(t("not_recognized_title", { ns: "meals" }));
        return;
      }

      await consumeAiUseFor(uid, !!isPremium, "text", FEATURE_LIMIT);
      setRetries(0);
      await fillDraftAndGo(ingredients);
    } catch {
      setRetries((prev) => prev + 1);
      Toast.show(t("text_ai_analyze_failed", { ns: "meals" }));
    } finally {
      setLoading(false);
    }
  }, [
    amountRaw,
    buildDescription,
    fillDraftAndGo,
    ingPreview,
    isPremium,
    language,
    name,
    retries,
    t,
    uid,
  ]);

  const analyzeDisabled =
    loading ||
    !name.trim() ||
    (amountRaw.length > 0 && (!isFinite(amountNum) || amountNum <= 0)) ||
    (!ingPreview.trim() && !amountRaw.length) ||
    retries >= MAX_RETRIES;

  const onNameChange = useCallback((text: string) => {
    setName(text);
  }, []);

  const onIngredientsChange = useCallback(
    (text: string) => {
      setIngPreview(text);
      if (ingredientsError) setIngredientsError(undefined);
    },
    [ingredientsError],
  );

  const onAmountChange = useCallback(
    (text: string) => {
      setAmount(text);
      if (ingredientsError) setIngredientsError(undefined);
    },
    [ingredientsError],
  );

  const onDescChange = useCallback((text: string) => {
    setDesc(text);
  }, []);

  const onNameBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, name: true }));
  }, []);

  const onAmountBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, amount: true }));
  }, []);

  const closeLimitModal = useCallback(() => {
    setShowLimitModal(false);
  }, []);

  const openPaywall = useCallback(() => {
    setShowLimitModal(false);
    navigation.navigate("ManageSubscription");
  }, [navigation]);

  return {
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
    featureLimit: FEATURE_LIMIT,
    onNameChange,
    onIngredientsChange,
    onAmountChange,
    onDescChange,
    onNameBlur,
    onAmountBlur,
    onAnalyze,
    closeLimitModal,
    openPaywall,
  };
}

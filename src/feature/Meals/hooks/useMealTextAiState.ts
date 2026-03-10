import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { v4 as uuidv4 } from "uuid";
import { Toast } from "@/components";
import { useAuthContext } from "@/context/AuthContext";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { extractIngredientsFromText } from "@/services/textMealService";
import type { AiTextMealPayload, AiUsageResponse } from "@/services/ai/contracts";
import { AiLimitExceededError } from "@/services/askDietAI";
import { get } from "@/services/apiClient";
import { captureException } from "@/services/errorLogger";
import { getAiUxErrorType } from "@/services/ai/uxError";
import type { Ingredient, Meal } from "@/types";
import type { RootStackParamList } from "@/navigation/navigate";

const FEATURE_LIMIT = 1;
const MAX_RETRIES = 3;
type Translate = (key: string, options?: Record<string, unknown>) => string;

export function useMealTextAiState(params: {
  t: Translate;
  language?: string;
}) {
  const { t, language } = params;
  const { uid } = useAuthContext();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
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
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit, setUsageLimit] = useState(FEATURE_LIMIT);
  const [remainingUsage, setRemainingUsage] = useState(FEATURE_LIMIT);

  const amountRaw = amount;
  const amountNum = useMemo(() => Number(amountRaw), [amountRaw]);

  const applyUsage = useCallback(
    (next: { usageCount: number; dailyLimit: number; remaining: number }) => {
      setUsageCount(next.usageCount);
      setUsageLimit(next.dailyLimit);
      setRemainingUsage(next.remaining);
    },
    [],
  );

  const loadBackendUsage = useCallback(
    async (source: string) => {
      if (!uid) {
        applyUsage({
          usageCount: 0,
          dailyLimit: FEATURE_LIMIT,
          remaining: FEATURE_LIMIT,
        });
        return null;
      }

      try {
        const usage = await get<AiUsageResponse>(
          "/ai/usage",
        );
        applyUsage(usage);
        return usage;
      } catch (error) {
        captureException(source, { userUid: uid }, error);
        applyUsage({
          usageCount: 0,
          dailyLimit: FEATURE_LIMIT,
          remaining: FEATURE_LIMIT,
        });
        return null;
      }
    },
    [applyUsage, uid],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      if (!uid) {
        if (active) {
          applyUsage({
            usageCount: 0,
            dailyLimit: FEATURE_LIMIT,
            remaining: FEATURE_LIMIT,
          });
        }
        return;
      }

      try {
        const usage = await get<AiUsageResponse>(
          "/ai/usage",
        );
        if (active) {
          applyUsage(usage);
        }
      } catch (error) {
        if (active) {
          captureException(
            "[useMealTextAiState] failed to load AI usage",
            { userUid: uid },
            error,
          );
          applyUsage({
            usageCount: 0,
            dailyLimit: FEATURE_LIMIT,
            remaining: FEATURE_LIMIT,
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [applyUsage, uid]);

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
    (uid: string): Meal => ({
      mealId: uuidv4(),
      userUid: uid,
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
    await saveDraft(uid, base);
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
      await saveDraft(uid, next);
      await setLastScreen(uid, "Result");
      navigation.replace("AddMeal", { start: "Result" });
    },
    [desc, ensureDraft, name, navigation, saveDraft, setLastScreen, setMeal, uid],
  );

  const buildPayload = useCallback((): AiTextMealPayload => {
    const parsedAmount = Number(amountRaw);
    const amount_g =
      isFinite(parsedAmount) && parsedAmount > 0
        ? Math.round(parsedAmount)
        : null;
    const ingredientsText = ingPreview.trim();
    const nameText = name.trim();
    return {
      name: nameText || null,
      ingredients: ingredientsText || nameText || null,
      amount_g,
      notes: desc.trim() || null,
    };
  }, [amountRaw, desc, ingPreview, name]);

  const nextRetryCount = useCallback(
    (current: number) => Math.min(current + 1, MAX_RETRIES),
    [],
  );

  const onAnalyze = useCallback(async () => {
    if (!uid) return;

    Keyboard.dismiss();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    setIngredientsError(undefined);
    setSubmitError(undefined);

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

    if (remainingUsage <= 0) {
      setShowLimitModal(true);
      return;
    }

    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        setSubmitError(t("text_ai_error_offline", { ns: "meals" }));
        return;
      }

      setLoading(true);
      const payload = buildPayload();
      const result = await extractIngredientsFromText(uid, payload, {
        lang: language || "en",
      });

      if (!result || result.ingredients.length === 0) {
        setRetries((prev) => nextRetryCount(prev));
        setSubmitError(t("text_ai_not_recognized_retry", { ns: "meals" }));
        Toast.show(t("not_recognized_title", { ns: "meals" }));
        return;
      }

      applyUsage({
        usageCount: result.usage.usageCount,
        dailyLimit: result.usage.dailyLimit,
        remaining: result.usage.remaining,
      });
      setRetries(0);
      await fillDraftAndGo(result.ingredients);
    } catch (error) {
      if (error instanceof AiLimitExceededError) {
        if (error.usage) {
          applyUsage(error.usage);
        } else {
          await loadBackendUsage(
            "[useMealTextAiState] failed to refresh AI usage after limit",
          );
        }
        setShowLimitModal(true);
        return;
      }
      const errorType = getAiUxErrorType(error);
      if (errorType === "offline") {
        setSubmitError(t("text_ai_error_offline", { ns: "meals" }));
        return;
      }
      if (errorType === "timeout") {
        setSubmitError(t("text_ai_error_timeout", { ns: "meals" }));
        return;
      }
      if (errorType === "unavailable") {
        setSubmitError(t("text_ai_error_unavailable", { ns: "meals" }));
        return;
      }
      if (errorType === "auth") {
        setSubmitError(t("text_ai_error_auth", { ns: "meals" }));
        return;
      }
      setRetries((prev) => nextRetryCount(prev));
      setSubmitError(t("text_ai_analyze_failed", { ns: "meals" }));
      Toast.show(t("text_ai_analyze_failed", { ns: "meals" }));
    } finally {
      setLoading(false);
    }
  }, [
    amountRaw,
    applyUsage,
    buildPayload,
    fillDraftAndGo,
    ingPreview,
    language,
    loadBackendUsage,
    name,
    nextRetryCount,
    remainingUsage,
    setSubmitError,
    t,
    uid,
  ]);

  const analyzeDisabled =
    loading ||
    !name.trim() ||
    (amountRaw.length > 0 && (!isFinite(amountNum) || amountNum <= 0)) ||
    (!ingPreview.trim() && !amountRaw.length);

  const limitUsed = usageCount;
  const featureLimit = usageLimit;

  const onNameChange = useCallback((text: string) => {
    setName(text);
    if (submitError) setSubmitError(undefined);
    if (retries > 0) setRetries(0);
  }, [retries, submitError]);

  const onIngredientsChange = useCallback(
    (text: string) => {
      setIngPreview(text);
      if (ingredientsError) setIngredientsError(undefined);
      if (submitError) setSubmitError(undefined);
      if (retries > 0) setRetries(0);
    },
    [ingredientsError, retries, submitError],
  );

  const onAmountChange = useCallback(
    (text: string) => {
      setAmount(text);
      if (ingredientsError) setIngredientsError(undefined);
      if (submitError) setSubmitError(undefined);
      if (retries > 0) setRetries(0);
    },
    [ingredientsError, retries, submitError],
  );

  const onDescChange = useCallback((text: string) => {
    setDesc(text);
    if (submitError) setSubmitError(undefined);
    if (retries > 0) setRetries(0);
  }, [retries, submitError]);

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
  };
}

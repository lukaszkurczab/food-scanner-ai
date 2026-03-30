import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import type { RootStackParamList } from "@/navigation/navigate";
import type {
  MealAddFlowApi,
  MealAddStepParams,
} from "@/feature/Meals/feature/MapMealAddScreens";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function useMealTextAiState(params: {
  t: Translate;
  language?: string;
  flow: Pick<MealAddFlowApi, "goTo">;
  initialValues?: MealAddStepParams["DescribeMeal"];
}) {
  const { t, flow, initialValues } = params;
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { credits, canAfford } = useAiCreditsContext();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [ingPreview, setIngPreview] = useState(initialValues?.ingPreview ?? "");
  const [amount, setAmount] = useState(initialValues?.amount ?? "");
  const [desc, setDesc] = useState(initialValues?.desc ?? "");
  const [touched, setTouched] = useState<{ name: boolean; amount: boolean }>({
    name: false,
    amount: false,
  });
  const [showLimitModal, setShowLimitModal] = useState(
    Boolean(initialValues?.showLimitModal),
  );
  const [retries, setRetries] = useState(initialValues?.retries ?? 0);
  const [ingredientsError, setIngredientsError] = useState<
    string | undefined
  >(initialValues?.ingredientsError);
  const [submitError, setSubmitError] = useState<string | undefined>(
    initialValues?.submitError,
  );

  useEffect(() => {
    setName(initialValues?.name ?? "");
    setIngPreview(initialValues?.ingPreview ?? "");
    setAmount(initialValues?.amount ?? "");
    setDesc(initialValues?.desc ?? "");
    setShowLimitModal(Boolean(initialValues?.showLimitModal));
    setRetries(initialValues?.retries ?? 0);
    setIngredientsError(initialValues?.ingredientsError);
    setSubmitError(initialValues?.submitError);
    setTouched({ name: false, amount: false });
  }, [
    initialValues?.amount,
    initialValues?.desc,
    initialValues?.ingPreview,
    initialValues?.ingredientsError,
    initialValues?.name,
    initialValues?.retries,
    initialValues?.showLimitModal,
    initialValues?.submitError,
  ]);

  const amountRaw = amount;
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

  const onAnalyze = useCallback(() => {
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

    if (!canAfford("textMeal")) {
      setShowLimitModal(true);
      return;
    }

    flow.goTo("TextAnalyzing", {
      name: name.trim(),
      ingPreview,
      amount,
      desc,
      retries,
    });
  }, [amount, amountRaw, canAfford, desc, flow, ingPreview, name, retries, t]);

  const analyzeDisabled =
    !name.trim() ||
    (amountRaw.length > 0 && (!isFinite(amountNum) || amountNum <= 0)) ||
    (!ingPreview.trim() && !amountRaw.length);

  const creditAllocation = credits?.allocation ?? 0;
  const creditsUsed = Math.max(creditAllocation - (credits?.balance ?? 0), 0);

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
    loading: false,
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
  };
}

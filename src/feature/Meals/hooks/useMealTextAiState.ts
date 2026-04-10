import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import type { RootStackParamList } from "@/navigation/navigate";
import type {
  AiCreditsResponse,
  AiCreditsStatus,
} from "@/services/ai/contracts";
import { post } from "@/services/core/apiClient";
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
  const { credits, canAfford, refreshCredits, applyCreditsFromResponse } =
    useAiCreditsContext();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [quickDescription, setQuickDescription] = useState(
    initialValues?.quickDescription ?? "",
  );
  const [loading, setLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(
    Boolean(initialValues?.showLimitModal),
  );
  const [retries, setRetries] = useState(initialValues?.retries ?? 0);
  const [descriptionError, setDescriptionError] = useState<
    string | undefined
  >(initialValues?.descriptionError);
  const [submitError, setSubmitError] = useState<string | undefined>(
    initialValues?.submitError,
  );

  useEffect(() => {
    setName(initialValues?.name ?? "");
    setQuickDescription(initialValues?.quickDescription ?? "");
    setShowLimitModal(Boolean(initialValues?.showLimitModal));
    setRetries(initialValues?.retries ?? 0);
    setDescriptionError(initialValues?.descriptionError);
    setSubmitError(initialValues?.submitError);
  }, [
    initialValues?.descriptionError,
    initialValues?.name,
    initialValues?.quickDescription,
    initialValues?.retries,
    initialValues?.showLimitModal,
    initialValues?.submitError,
  ]);

  const reconcileCredits = useCallback(async (): Promise<AiCreditsStatus | null> => {
    let syncedSnapshot: AiCreditsStatus | null = null;

    try {
      const syncedResponse = await post<AiCreditsResponse>("/ai/credits/sync-tier");
      syncedSnapshot = applyCreditsFromResponse(syncedResponse);
    } catch {
      // Fall back to standard refresh when reconciliation endpoint is unavailable.
    }

    const refreshedSnapshot = await refreshCredits();
    return refreshedSnapshot ?? syncedSnapshot ?? credits;
  }, [applyCreditsFromResponse, credits, refreshCredits]);

  const onAnalyze = useCallback(async () => {
    setDescriptionError(undefined);
    setSubmitError(undefined);

    if (!quickDescription.trim()) {
      setDescriptionError(
        t("text_ai_require_quick_description", { ns: "meals" }),
      );
      return;
    }

    setLoading(true);
    try {
      let resolvedCredits = credits;

      if (resolvedCredits && canAfford("textMeal")) {
        flow.goTo("TextAnalyzing", {
          name: name.trim(),
          quickDescription: quickDescription.trim(),
          retries,
        });
        return;
      }

      resolvedCredits = await reconcileCredits();

      if (
        resolvedCredits &&
        resolvedCredits.balance < resolvedCredits.costs.textMeal
      ) {
        setShowLimitModal(true);
        return;
      }

      flow.goTo("TextAnalyzing", {
        name: name.trim(),
        quickDescription: quickDescription.trim(),
        retries,
      });
    } finally {
      setLoading(false);
    }
  }, [
    canAfford,
    credits,
    flow,
    name,
    quickDescription,
    reconcileCredits,
    retries,
    t,
  ]);

  const analyzeDisabled = useMemo(
    () => !quickDescription.trim(),
    [quickDescription],
  );

  const creditAllocation = credits?.allocation ?? 0;
  const creditsUsed = Math.max(creditAllocation - (credits?.balance ?? 0), 0);
  const textMealCost = credits?.costs.textMeal ?? 1;
  const creditsBalance = credits?.balance ?? null;
  const remainingCreditsAfterAnalyze =
    creditsBalance === null ? null : Math.max(creditsBalance - textMealCost, 0);

  const onNameChange = useCallback((text: string) => {
    setName(text);
    if (submitError) setSubmitError(undefined);
    if (retries > 0) setRetries(0);
  }, [retries, submitError]);

  const onQuickDescriptionChange = useCallback(
    (text: string) => {
      setQuickDescription(text);
      if (descriptionError) setDescriptionError(undefined);
      if (submitError) setSubmitError(undefined);
      if (retries > 0) setRetries(0);
    },
    [descriptionError, retries, submitError],
  );

  const closeLimitModal = useCallback(() => {
    setShowLimitModal(false);
  }, []);

  const openPaywall = useCallback(() => {
    setShowLimitModal(false);
    navigation.navigate("ManageSubscription");
  }, [navigation]);

  return {
    name,
    quickDescription,
    loading,
    retries,
    showLimitModal,
    creditsUsed,
    creditsBalance,
    textMealCost,
    remainingCreditsAfterAnalyze,
    descriptionError,
    submitError,
    analyzeDisabled,
    creditAllocation,
    onNameChange,
    onQuickDescriptionChange,
    onAnalyze,
    closeLimitModal,
    openPaywall,
  };
}

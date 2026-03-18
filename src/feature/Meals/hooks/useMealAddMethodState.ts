import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import type { StackNavigationProp } from "@react-navigation/stack";
import { getDraftKey, getScreenKey } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import type { RootStackParamList } from "@/navigation/navigate";
import type { Ingredient, Meal, MealInputMethod } from "@/types/meal";
import { MaterialIcons } from "@expo/vector-icons";
import { debugScope } from "@/utils/debug";
import {
  E2E_DETERMINISTIC_INGREDIENT,
  isE2EModeEnabled,
} from "@/services/e2e/config";

type MealAddMethodNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MealAddMethod"
>;

type DraftResumeScreen = "AddMeal" | "EditReviewIngredients" | "EditResult";

type AddMealStart = NonNullable<
  NonNullable<RootStackParamList["AddMeal"]>["start"]
>;

type MethodOptionBase = {
  key: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  titleKey: string;
  descKey: string;
};

type AddMealMethodOption = MethodOptionBase & {
  screen: "AddMeal";
  params: NonNullable<RootStackParamList["AddMeal"]>;
};

type NonAddMealMethodOption = MethodOptionBase & {
  screen: "MealTextAI" | "SelectSavedMeal";
};

export type MethodOption = AddMealMethodOption | NonAddMealMethodOption;

export const mealAddMethodOptions: readonly MethodOption[] = [
  {
    key: "ai_photo",
    icon: "camera-alt",
    titleKey: "aiTitle",
    descKey: "aiDesc",
    screen: "AddMeal",
    params: {
      start: "MealCamera",
      returnTo: "Result",
      attempt: 1,
    },
  },
  {
    key: "ai_text",
    icon: "chat",
    titleKey: "aiTextTitle",
    descKey: "aiTextDesc",
    screen: "MealTextAI",
  },
  {
    key: "manual",
    icon: "edit",
    titleKey: "manualTitle",
    descKey: "manualDesc",
    screen: "AddMeal",
    params: {
      start: "Result",
    },
  },
  {
    key: "saved",
    icon: "library-books",
    titleKey: "savedTitle",
    descKey: "savedDesc",
    screen: "SelectSavedMeal",
  },
] as const;

const isDraftResumeScreen = (value: string): value is DraftResumeScreen =>
  value === "AddMeal" ||
  value === "EditReviewIngredients" ||
  value === "EditResult";

const log = debugScope("Hook:useMealAddMethodState");
const E2E_DRAFT_MEAL_ID = "e2e-draft-meal";

function makeE2EDraftIngredient(): Ingredient {
  return { ...E2E_DETERMINISTIC_INGREDIENT };
}

const hasNonEmptyText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

function ingredientHasMeaningfulContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const ingredient = payload as Partial<Meal["ingredients"][number]>;

  return Boolean(
    hasNonEmptyText(ingredient.name) ||
      isPositiveNumber(ingredient.amount) ||
      isPositiveNumber(ingredient.kcal) ||
      isPositiveNumber(ingredient.protein) ||
      isPositiveNumber(ingredient.carbs) ||
      isPositiveNumber(ingredient.fat),
  );
}

function hasMeaningfulDraft(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const draft = payload as Partial<Meal> & { isDirty?: unknown };
  const hasIdentity =
    hasNonEmptyText(draft.mealId) || hasNonEmptyText(draft.createdAt);
  if (!hasIdentity) return false;

  const hasIngredients =
    Array.isArray(draft.ingredients) &&
    draft.ingredients.some((ingredient) =>
      ingredientHasMeaningfulContent(ingredient),
    );
  const hasPhoto =
    hasNonEmptyText(draft.photoUrl) ||
    hasNonEmptyText(draft.localPhotoUrl) ||
    hasNonEmptyText(draft.photoLocalPath);
  const hasTotals =
    !!draft.totals &&
    (isPositiveNumber(draft.totals.kcal) ||
      isPositiveNumber(draft.totals.protein) ||
      isPositiveNumber(draft.totals.carbs) ||
      isPositiveNumber(draft.totals.fat));
  const hasDirtyFlag = draft.isDirty === true;

  return hasIngredients || hasPhoto || hasTotals || hasDirtyFlag;
}

function getInputMethodForOption(option: MethodOption): MealInputMethod | null {
  if (option.key === "ai_photo") return "photo";
  if (option.key === "ai_text") return "text";
  if (option.key === "manual") return "manual";
  if (option.key === "saved") return "saved";
  return null;
}

export function useMealAddMethodState(params: {
  navigation: MealAddMethodNavigationProp;
}) {
  const { uid } = useAuthContext();
  const { setMeal, saveDraft, setLastScreen, loadDraft, removeDraft } =
    useMealDraftContext();

  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeScreen, setResumeScreen] =
    useState<DraftResumeScreen | null>(null);
  const [showAiLimitModal, setShowAiLimitModal] = useState(false);

  const checkDraft = useCallback(async () => {
    if (!uid) return;

    const [draftRaw, lastScreenStored] = await Promise.all([
      AsyncStorage.getItem(getDraftKey(uid)),
      AsyncStorage.getItem(getScreenKey(uid)),
    ]);

    if (!draftRaw) {
      return;
    }

    try {
      const parsed = JSON.parse(draftRaw) as unknown;
      if (!hasMeaningfulDraft(parsed)) {
        log.log("Removing inactive meal draft after startup sanity-check.");
        await removeDraft(uid);
        return;
      }

      if (!lastScreenStored || !isDraftResumeScreen(lastScreenStored)) {
        log.log("Active draft found but no resumable screen.", {
          lastScreenStored: lastScreenStored ?? null,
        });
        return;
      }

      setResumeScreen(lastScreenStored);
      setShowResumeModal(true);
      log.log("Active draft found. Showing resume modal.", {
        resumeScreen: lastScreenStored,
      });
    } catch {
      log.log("Removing malformed meal draft payload.");
      await removeDraft(uid);
    }
  }, [removeDraft, uid]);

  useEffect(() => {
    void checkDraft();
  }, [checkDraft]);

  const primeEmptyMeal = useCallback(
    async (nextScreen: AddMealStart, inputMethod?: MealInputMethod | null) => {
      if (!uid) return;

      const now = new Date().toISOString();
      const isE2E = isE2EModeEnabled();
      const deterministicIngredients =
        isE2E && nextScreen === "Result"
          ? [makeE2EDraftIngredient()]
          : [];
      const emptyMeal: Meal = {
        mealId: isE2E ? E2E_DRAFT_MEAL_ID : uuidv4(),
        userUid: uid,
        name: null,
        photoUrl: null,
        ingredients: deterministicIngredients,
        createdAt: now,
        updatedAt: now,
        syncState: "pending",
        tags: [],
        deleted: false,
        notes: null,
        type: "other",
        timestamp: "",
        source: null,
        inputMethod: inputMethod ?? null,
        aiMeta: null,
      };

      setMeal(emptyMeal);
      await saveDraft(uid, emptyMeal);
      await setLastScreen(uid, nextScreen);
    },
    [saveDraft, setLastScreen, setMeal, uid],
  );

  const handleOptionPress = useCallback(
    async (option: MethodOption) => {
      if (option.screen === "AddMeal") {
        const start = option.params.start;
        await primeEmptyMeal(
          start || "Result",
          getInputMethodForOption(option),
        );
        params.navigation.navigate("AddMeal", option.params);
        return;
      }

      params.navigation.navigate(option.screen);
    },
    [params.navigation, primeEmptyMeal],
  );

  const handleContinueDraft = useCallback(async () => {
    if (uid) {
      await loadDraft(uid);
    }

    setShowResumeModal(false);

    if (resumeScreen) {
      if (resumeScreen === "AddMeal") {
        log.log("Resuming AddMeal draft at Result.");
        params.navigation.navigate("AddMeal", { start: "Result" });
        return;
      }
      params.navigation.navigate(resumeScreen);
    }
  }, [loadDraft, params.navigation, resumeScreen, uid]);

  const handleDiscardDraft = useCallback(async () => {
    if (uid) {
      await removeDraft(uid);
    }

    setResumeScreen(null);
    setShowResumeModal(false);
  }, [removeDraft, uid]);

  const closeResumeModal = useCallback(() => {
    setShowResumeModal(false);
  }, []);

  const closeAiLimitModal = useCallback(() => {
    setShowAiLimitModal(false);
  }, []);

  const handleAiLimitUpgrade = useCallback(() => {
    setShowAiLimitModal(false);
    params.navigation.navigate("ManageSubscription");
  }, [params.navigation]);

  return {
    options: mealAddMethodOptions,
    showResumeModal,
    showAiLimitModal,
    handleOptionPress,
    handleContinueDraft,
    handleDiscardDraft,
    closeResumeModal,
    closeAiLimitModal,
    handleAiLimitUpgrade,
  };
}

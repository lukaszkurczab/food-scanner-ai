import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import type { StackNavigationProp } from "@react-navigation/stack";
import { getDraftKey, getScreenKey } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import type { RootStackParamList } from "@/navigation/navigate";
import type { Ingredient, Meal, MealInputMethod } from "@/types/meal";
import type { AppIconName } from "@/components/AppIcon";
import { debugScope } from "@/utils/debug";
import { emit, on } from "@/services/core/events";
import {
  E2E_DETERMINISTIC_INGREDIENT,
  isE2EModeEnabled,
} from "@/services/e2e/config";

type MealAddMethodNavigationProp = {
  navigate: Pick<
    StackNavigationProp<RootStackParamList, "Home">,
    "navigate"
  >["navigate"];
  replace: Pick<
    StackNavigationProp<RootStackParamList, "Home">,
    "replace"
  >["replace"];
};

type DraftResumeScreen = "AddMeal" | "EditReviewIngredients" | "EditResult";

type AddMealStart = NonNullable<
  NonNullable<RootStackParamList["AddMeal"]>["start"]
>;

type MethodOptionBase = {
  key: "photo" | "text" | "barcode" | "saved";
  icon: AppIconName;
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
    key: "photo",
    icon: "camera",
    titleKey: "photoTitle",
    descKey: "photoDesc",
    screen: "AddMeal",
    params: {
      start: "MealCamera",
      returnTo: "Result",
      attempt: 1,
    },
  },
  {
    key: "text",
    icon: "edit",
    titleKey: "textTitle",
    descKey: "textDesc",
    screen: "MealTextAI",
  },
  {
    key: "barcode",
    icon: "scan-barcode",
    titleKey: "barcodeTitle",
    descKey: "barcodeDesc",
    screen: "AddMeal",
    params: {
      start: "MealCamera",
      barcodeOnly: true,
      returnTo: "Result",
      attempt: 1,
    },
  },
  {
    key: "saved",
    icon: "saved-items",
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
const PREFERRED_METHOD_STORAGE_KEY = "meal-add-preferred-method";
const DEFAULT_PREFERRED_METHOD = "photo";
const PREFERRED_METHOD_CHANGED_EVENT = "meal:add-method:preferred-changed";

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
  if (option.key === "photo") return "photo";
  if (option.key === "text") return "text";
  if (option.key === "barcode") return "barcode";
  if (option.key === "saved") return "saved";
  return null;
}

function isMealAddMethodOptionKey(
  value: string | null,
): value is MethodOption["key"] {
  return mealAddMethodOptions.some((option) => option.key === value);
}

function getMethodOptionByKey(key: MethodOption["key"]): MethodOption {
  return (
    mealAddMethodOptions.find((option) => option.key === key) ??
    mealAddMethodOptions[0]
  );
}

export function useMealAddMethodState(params: {
  navigation: MealAddMethodNavigationProp;
  replaceOnStart?: boolean;
  persistSelection?: boolean;
}) {
  const { uid } = useAuthContext();
  const { setMeal, saveDraft, setLastScreen, loadDraft, removeDraft } =
    useMealDraftContext();

  const [preferredMethodKey, setPreferredMethodKey] =
    useState<MethodOption["key"]>(DEFAULT_PREFERRED_METHOD);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeScreen, setResumeScreen] =
    useState<DraftResumeScreen | null>(null);
  const [pendingOption, setPendingOption] = useState<MethodOption | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPreferredMethod = async () => {
      const stored = await AsyncStorage.getItem(PREFERRED_METHOD_STORAGE_KEY);

      if (!cancelled && isMealAddMethodOptionKey(stored)) {
        setPreferredMethodKey(stored);
      }
    };

    void loadPreferredMethod();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = on<{ key?: MethodOption["key"] }>(
      PREFERRED_METHOD_CHANGED_EVENT,
      (payload) => {
        if (!payload?.key || !isMealAddMethodOptionKey(payload.key)) {
          return;
        }

        setPreferredMethodKey(payload.key);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

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

  const persistPreferredMethod = useCallback(async (key: MethodOption["key"]) => {
    setPreferredMethodKey(key);
    await AsyncStorage.setItem(PREFERRED_METHOD_STORAGE_KEY, key);
    emit(PREFERRED_METHOD_CHANGED_EVENT, { key });
  }, []);

  const openAddMeal = useCallback(
    (routeParams: RootStackParamList["AddMeal"]) => {
      if (params.replaceOnStart) {
        params.navigation.replace("AddMeal", routeParams);
        return;
      }

      params.navigation.navigate("AddMeal", routeParams);
    },
    [params.navigation, params.replaceOnStart],
  );

  const openSimpleScreen = useCallback(
    (
      name:
        | "MealTextAI"
        | "SelectSavedMeal"
        | "EditReviewIngredients"
        | "EditResult",
    ) => {
      if (params.replaceOnStart) {
        params.navigation.replace(name);
        return;
      }

      params.navigation.navigate(name);
    },
    [params.navigation, params.replaceOnStart],
  );

  const executeOption = useCallback(
    async (option: MethodOption) => {
      if (option.screen === "AddMeal") {
        const start = option.params.start;
        await primeEmptyMeal(
          start || "Result",
          getInputMethodForOption(option),
        );
        openAddMeal(option.params);
        return;
      }

      openSimpleScreen(option.screen);
    },
    [openAddMeal, openSimpleScreen, primeEmptyMeal],
  );

  const checkDraftBeforeLaunch = useCallback(
    async (option: MethodOption): Promise<boolean> => {
      if (!uid) return false;

      const [draftRaw, lastScreenStored] = await Promise.all([
        AsyncStorage.getItem(getDraftKey(uid)),
        AsyncStorage.getItem(getScreenKey(uid)),
      ]);

      if (!draftRaw) {
        return false;
      }

      try {
        const parsed = JSON.parse(draftRaw) as unknown;
        if (!hasMeaningfulDraft(parsed)) {
          log.log("Removing inactive meal draft after startup sanity-check.");
          await removeDraft(uid);
          return false;
        }

        if (!lastScreenStored || !isDraftResumeScreen(lastScreenStored)) {
          log.log("Active draft found but no resumable screen.", {
            lastScreenStored: lastScreenStored ?? null,
          });
          return false;
        }

        setPendingOption(option);
        setResumeScreen(lastScreenStored);
        setShowResumeModal(true);
        log.log("Active draft found. Showing resume modal.", {
          resumeScreen: lastScreenStored,
          pendingOption: option.key,
        });
        return true;
      } catch {
        log.log("Removing malformed meal draft payload.");
        await removeDraft(uid);
        return false;
      }
    },
    [removeDraft, uid],
  );

  const handleOptionPress = useCallback(
    async (option: MethodOption) => {
      if (params.persistSelection) {
        await persistPreferredMethod(option.key);
      }

      const shouldPauseForDraft = await checkDraftBeforeLaunch(option);
      if (shouldPauseForDraft) {
        return;
      }

      await executeOption(option);
    },
    [
      checkDraftBeforeLaunch,
      executeOption,
      params.persistSelection,
      persistPreferredMethod,
    ],
  );

  const handleDirectStart = useCallback(async () => {
    const option = getMethodOptionByKey(preferredMethodKey);
    await handleOptionPress(option);
  }, [handleOptionPress, preferredMethodKey]);

  const handleContinueDraft = useCallback(async () => {
    if (uid) {
      await loadDraft(uid);
    }

    setShowResumeModal(false);
    setPendingOption(null);

    if (resumeScreen) {
      if (resumeScreen === "AddMeal") {
        log.log("Resuming AddMeal draft at Result.");
        openAddMeal({ start: "Result" });
        return;
      }
      openSimpleScreen(resumeScreen);
    }
  }, [loadDraft, openAddMeal, openSimpleScreen, resumeScreen, uid]);

  const handleDiscardDraft = useCallback(async () => {
    if (uid) {
      await removeDraft(uid);
    }

    setShowResumeModal(false);
    setResumeScreen(null);

    const nextOption = pendingOption;
    setPendingOption(null);

    if (nextOption) {
      await executeOption(nextOption);
    }
  }, [executeOption, pendingOption, removeDraft, uid]);

  const closeResumeModal = useCallback(() => {
    setShowResumeModal(false);
    setPendingOption(null);
    setResumeScreen(null);
  }, []);

  return {
    options: mealAddMethodOptions,
    preferredMethodKey,
    preferredOption: getMethodOptionByKey(preferredMethodKey),
    handleDirectStart,
    showResumeModal,
    handleOptionPress,
    handleContinueDraft,
    handleDiscardDraft,
    closeResumeModal,
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import type { Ingredient, Meal, MealType } from "@/types/meal";
import type {
  MealAddFlowApi,
  MealAddScreenName,
} from "@/feature/Meals/feature/MapMealAddScreens";

export type MealDetailsFormMode = "manual" | "review";

type MealDetailsNavigation = {
  navigate: (
    screen: "Home" | "MealAddMethod",
    params?: { selectionMode: "temporary"; origin: "mealAddFlow" },
  ) => void;
};

type UseMealDetailsFormParams = {
  mode: MealDetailsFormMode;
  flow: MealAddFlowApi;
  navigation: MealDetailsNavigation;
  onReviewSubmit?: (meal: Meal) => Promise<void> | void;
};

export function isValidIsoDate(value?: string | null) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

export function getMealDateOrNow(value?: string | null) {
  return isValidIsoDate(value) && value ? new Date(value) : new Date();
}

export function formatMealTime(value: Date, locale: string, hour12: boolean) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).format(value);
}

function buildDraftIngredient(source?: Ingredient | null): Ingredient {
  return {
    id: source?.id ?? uuidv4(),
    name: source?.name ?? "",
    amount: source?.amount ?? 1,
    unit: source?.unit ?? "g",
    kcal: source?.kcal ?? 0,
    protein: source?.protein ?? 0,
    carbs: source?.carbs ?? 0,
    fat: source?.fat ?? 0,
  };
}

function getResumeTrackingScreen(mode: MealDetailsFormMode): MealAddScreenName {
  return mode === "manual" ? "ManualMealEntry" : "EditMealDetails";
}

export function useMealDetailsForm({
  mode,
  flow,
  navigation,
  onReviewSubmit,
}: UseMealDetailsFormParams) {
  const { i18n } = useTranslation(["meals", "common"]);
  const { uid } = useAuthContext();
  const { meal, loadDraft, saveDraft, setMeal, setLastScreen } = useMealDraftContext();
  const mealTimestamp = meal?.timestamp;
  const isManualMode = mode === "manual";

  const [mealName, setMealName] = useState(meal?.name ?? "");
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [typeDraft, setTypeDraft] = useState<MealType>(meal?.type ?? "other");
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(getMealDateOrNow(mealTimestamp));
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null);
  const [ingredientDraft, setIngredientDraft] = useState<Ingredient | null>(null);

  useEffect(() => {
    setMealName(meal?.name ?? "");
  }, [meal?.name]);

  useEffect(() => {
    setHasPendingChanges(false);
  }, [meal?.mealId, mode]);

  useEffect(() => {
    setTypeDraft(meal?.type ?? "other");
  }, [meal?.type]);

  useEffect(() => {
    if (isValidIsoDate(mealTimestamp) && mealTimestamp) {
      setPickerDate(new Date(mealTimestamp));
    }
  }, [mealTimestamp]);

  useEffect(() => {
    if (uid) {
      void setLastScreen(uid, getResumeTrackingScreen(mode));
    }
  }, [mode, setLastScreen, uid]);

  const retryLoadDraft = useCallback(async () => {
    if (!uid) return;
    await loadDraft(uid);
  }, [loadDraft, uid]);

  const persistMeal = useCallback(
    async (nextMeal: Meal) => {
      setMeal(nextMeal);
      if (uid) {
        await saveDraft(uid, nextMeal);
      }
    },
    [saveDraft, setMeal, uid],
  );

  const persistMealPatch = useCallback(
    async (patch: Partial<Meal>) => {
      if (!meal) return;
      const nextMeal: Meal = {
        ...meal,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await persistMeal(nextMeal);
    },
    [meal, persistMeal],
  );

  const handleNameBlur = useCallback(async () => {
    await persistMealPatch({ name: mealName.trim() || null });
  }, [mealName, persistMealPatch]);

  const handleMealNameChange = useCallback((value: string) => {
    setMealName(value);
    setHasPendingChanges(true);
  }, []);

  const handleOpenTypePicker = useCallback(() => {
    setTypeDraft(meal?.type ?? "other");
    setTypePickerVisible(true);
  }, [meal?.type]);

  const handleCloseTypePicker = useCallback(() => {
    setTypePickerVisible(false);
    setTypeDraft(meal?.type ?? "other");
  }, [meal?.type]);

  const handleApplyType = useCallback(
    async (nextType: MealType) => {
      await persistMealPatch({ type: nextType });
      setHasPendingChanges(true);
      setTypePickerVisible(false);
    },
    [persistMealPatch],
  );

  const handleCloseTimePicker = useCallback(() => {
    setPickerDate(getMealDateOrNow(mealTimestamp));
    setTimePickerVisible(false);
  }, [mealTimestamp]);

  const handleOpenTimePicker = useCallback(() => {
    setPickerDate(getMealDateOrNow(mealTimestamp));
    setTimePickerVisible(true);
  }, [mealTimestamp]);

  const handleSaveTime = useCallback(async () => {
    const baseDate = getMealDateOrNow(mealTimestamp);
    const nextTimestamp = new Date(baseDate);
    nextTimestamp.setHours(pickerDate.getHours(), pickerDate.getMinutes(), 0, 0);

    await persistMealPatch({ timestamp: nextTimestamp.toISOString() });
    setHasPendingChanges(true);
    setTimePickerVisible(false);
  }, [mealTimestamp, persistMealPatch, pickerDate]);

  const handleOpenIngredientEditor = useCallback(
    (index: number | null) => {
      const source = index === null ? null : (meal?.ingredients ?? [])[index] ?? null;
      setEditingIngredientIndex(index);
      setIngredientDraft(buildDraftIngredient(source));
    },
    [meal?.ingredients],
  );

  const handleCloseIngredientEditor = useCallback(() => {
    setEditingIngredientIndex(null);
    setIngredientDraft(null);
  }, []);

  const handleCommitIngredient = useCallback(
    async (updated: Ingredient) => {
      if (!meal) return;

      const currentIngredients = meal.ingredients ?? [];
      const nextIngredients =
        editingIngredientIndex === null
          ? [...currentIngredients, updated]
          : currentIngredients.map((ingredient, index) =>
              index === editingIngredientIndex ? updated : ingredient,
            );

      await persistMeal({
        ...meal,
        ingredients: nextIngredients,
        updatedAt: new Date().toISOString(),
      });
      setHasPendingChanges(true);
      handleCloseIngredientEditor();
    },
    [editingIngredientIndex, handleCloseIngredientEditor, meal, persistMeal],
  );

  const handleDeleteIngredient = useCallback(async () => {
    if (!meal || editingIngredientIndex === null) return;

    await persistMeal({
      ...meal,
      ingredients: (meal.ingredients ?? []).filter(
        (_ingredient, index) => index !== editingIngredientIndex,
      ),
      updatedAt: new Date().toISOString(),
    });
    setHasPendingChanges(true);
    handleCloseIngredientEditor();
  }, [editingIngredientIndex, handleCloseIngredientEditor, meal, persistMeal]);

  const handleSubmit = useCallback(async () => {
    const trimmedName = mealName.trim();

    if (!isManualMode) {
      if (!meal) return;
      const nextMeal: Meal = {
        ...meal,
        name: trimmedName || null,
        updatedAt: new Date().toISOString(),
      };
      await persistMeal(nextMeal);
      if (onReviewSubmit) {
        await onReviewSubmit(nextMeal);
      } else {
        flow.goBack();
      }
      setHasPendingChanges(false);
      return;
    }

    if (!meal || !uid || !trimmedName) {
      return;
    }

    const nowIso = new Date().toISOString();
    const nextMeal: Meal = {
      ...meal,
      userUid: uid,
      name: trimmedName,
      type: meal.type || "other",
      timestamp: pickerDate.toISOString(),
      createdAt: meal.createdAt || nowIso,
      updatedAt: nowIso,
      syncState: "pending",
      source: "manual",
      inputMethod: meal.inputMethod ?? "manual",
    };

    await persistMeal(nextMeal);
    setHasPendingChanges(false);
    flow.replace("ReviewMeal", {});
  }, [
    flow,
    isManualMode,
    meal,
    mealName,
    onReviewSubmit,
    persistMeal,
    pickerDate,
    uid,
  ]);

  const handleChangeMethod = useCallback(() => {
    navigation.navigate("MealAddMethod", {
      selectionMode: "temporary",
      origin: "mealAddFlow",
    });
  }, [navigation]);

  const locale = i18n?.language || "en";
  const prefers12h = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        timeZone: "UTC",
      }).formatToParts(new Date(Date.UTC(2020, 0, 1, 13)));
      return parts.some((part) => part.type === "dayPeriod");
    } catch {
      return false;
    }
  }, [locale]);

  const ingredients = meal?.ingredients ?? [];
  const manualSubmitDisabled = !uid || !meal || mealName.trim().length === 0;

  return {
    uid,
    meal,
    mealTimestamp,
    isManualMode,
    mealName,
    setMealName: handleMealNameChange,
    typePickerVisible,
    setTypePickerVisible,
    typeDraft,
    setTypeDraft,
    timePickerVisible,
    setTimePickerVisible,
    pickerDate,
    setPickerDate,
    editingIngredientIndex,
    ingredientDraft,
    locale,
    prefers12h,
    ingredients,
    manualSubmitDisabled,
    retryLoadDraft,
    handleNameBlur,
    handleOpenTypePicker,
    handleCloseTypePicker,
    handleApplyType,
    handleOpenTimePicker,
    handleCloseTimePicker,
    handleSaveTime,
    handleOpenIngredientEditor,
    handleCloseIngredientEditor,
    handleCommitIngredient,
    handleDeleteIngredient,
    handleSubmit,
    handleChangeMethod,
    hasPendingChanges,
  };
}

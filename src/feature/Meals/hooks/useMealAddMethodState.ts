import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import type { StackNavigationProp } from "@react-navigation/stack";
import { getDraftKey, getScreenKey } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { usePremiumContext } from "@/context/PremiumContext";
import { canUseAiTodayFor } from "@/services/userService";
import type { RootStackParamList } from "@/navigation/navigate";
import type { Meal } from "@/types/meal";
import { MaterialIcons } from "@expo/vector-icons";

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
      returnTo: "ReviewIngredients",
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
      start: "ReviewIngredients",
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

function hasMeaningfulDraft(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const draft = payload as Partial<Meal>;

  return Boolean(
    (typeof draft.name === "string" && draft.name.trim()) ||
      (Array.isArray(draft.ingredients) && draft.ingredients.length > 0) ||
      draft.photoUrl,
  );
}

export function useMealAddMethodState(params: {
  navigation: MealAddMethodNavigationProp;
}) {
  const { uid } = useAuthContext();
  const { setMeal, saveDraft, setLastScreen, loadDraft, removeDraft } =
    useMealDraftContext();
  const { isPremium } = usePremiumContext();

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

    if (!draftRaw || !lastScreenStored || !isDraftResumeScreen(lastScreenStored)) {
      return;
    }

    try {
      const parsed = JSON.parse(draftRaw) as unknown;
      if (hasMeaningfulDraft(parsed)) {
        setResumeScreen(lastScreenStored);
        setShowResumeModal(true);
      }
    } catch {
      // Ignore malformed draft payload in storage.
    }
  }, [uid]);

  useEffect(() => {
    void checkDraft();
  }, [checkDraft]);

  const primeEmptyMeal = useCallback(
    async (nextScreen: AddMealStart) => {
      if (!uid) return;

      const now = new Date().toISOString();
      const emptyMeal: Meal = {
        mealId: uuidv4(),
        userUid: uid,
        name: null,
        photoUrl: null,
        ingredients: [],
        createdAt: now,
        updatedAt: now,
        syncState: "pending",
        tags: [],
        deleted: false,
        notes: null,
        type: "other",
        timestamp: "",
        source: null,
      };

      setMeal(emptyMeal);
      await saveDraft(uid);
      await setLastScreen(uid, nextScreen);
    },
    [saveDraft, setLastScreen, setMeal, uid],
  );

  const handleOptionPress = useCallback(
    async (option: MethodOption) => {
      if (option.screen === "MealTextAI" && uid) {
        const allowed = await canUseAiTodayFor(uid, !!isPremium, "text", 1);
        if (!allowed) {
          setShowAiLimitModal(true);
          return;
        }
      }

      if (option.screen === "AddMeal") {
        const start = option.params.start;
        await primeEmptyMeal(start || "ReviewIngredients");
        params.navigation.navigate("AddMeal", option.params);
        return;
      }

      params.navigation.navigate(option.screen);
    },
    [isPremium, params.navigation, primeEmptyMeal, uid],
  );

  const handleContinueDraft = useCallback(async () => {
    if (uid) {
      await loadDraft(uid);
    }

    setShowResumeModal(false);

    if (resumeScreen) {
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

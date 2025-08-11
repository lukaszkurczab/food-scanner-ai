import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Meal, Ingredient, MealType } from "@/types/meal";

export function getDraftKey(userUid: string) {
  return `current_meal_draft_${userUid}`;
}
export function getScreenKey(userUid: string) {
  return `current_meal_draft_screen_${userUid}`;
}

export type MealDraftContextType = {
  meal: Meal | null;
  setMeal: (meal: Meal) => void;
  updateMeal: (patch: Partial<Meal>) => void;
  clearMeal: (userUid: string) => void;
  addIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (index: number) => void;
  updateIngredient: (index: number, ingredient: Ingredient) => void;
  setType: (type: MealType) => void;
  setPhotoUrl: (url: string | null) => void;
  setNotes: (notes: string | null) => void;
  setTags: (tags: string[]) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  isDraft: boolean;
  saveDraft: (userUid: string) => Promise<void>;
  loadDraft: (userUid: string) => Promise<void>;
  removeDraft: (userUid: string) => Promise<void>;
  loadLastScreen: (userUid: string) => void;
  lastScreen: string | null;
  setLastScreen: (userUid: string, screen: string) => void;
  clearLastScreen: (userUid: string) => void;
};

const MealDraftContext = createContext<MealDraftContextType>({
  meal: null,
  setMeal: () => {},
  updateMeal: () => {},
  clearMeal: () => {},
  addIngredient: () => {},
  removeIngredient: () => {},
  updateIngredient: () => {},
  setType: () => {},
  setPhotoUrl: () => {},
  setNotes: () => {},
  setTags: () => {},
  addTag: () => {},
  removeTag: () => {},
  isDraft: false,
  saveDraft: async () => {},
  loadDraft: async () => {},
  removeDraft: async () => {},
  lastScreen: null,
  setLastScreen: () => {},
  loadLastScreen: () => {},
  clearLastScreen: () => {},
});

type Props = { children: ReactNode };

export const MealDraftProvider = ({ children }: Props) => {
  const [meal, setMealState] = useState<Meal | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  const [lastScreen, setLastScreenState] = useState<string | null>(null);

  const saveDraft = useCallback(
    async (userUid: string) => {
      if (meal) {
        await AsyncStorage.setItem(getDraftKey(userUid), JSON.stringify(meal));
        setIsDraft(true);
      }
    },
    [meal]
  );

  const loadDraft = useCallback(async (userUid: string) => {
    const raw = await AsyncStorage.getItem(getDraftKey(userUid));
    if (raw) {
      setMealState(JSON.parse(raw));
      setIsDraft(true);
    } else {
      setMealState(null);
      setIsDraft(false);
    }
  }, []);

  const removeDraft = useCallback(async (userUid: string) => {
    await AsyncStorage.removeItem(getDraftKey(userUid));
    setIsDraft(false);
    clearLastScreen(userUid);
  }, []);

  const setLastScreen = useCallback(async (userUid: string, screen: string) => {
    setLastScreenState(screen);
    await AsyncStorage.setItem(getScreenKey(userUid), screen);
  }, []);

  const clearLastScreen = useCallback(async (userUid: string) => {
    setLastScreenState(null);
    await AsyncStorage.removeItem(getScreenKey(userUid));
  }, []);

  const loadLastScreen = useCallback(async (userUid: string) => {
    const screen = await AsyncStorage.getItem(getScreenKey(userUid));
    setLastScreenState(screen || null);
  }, []);

  const setMeal = (meal: Meal) => setMealState(meal);

  const updateMeal = (patch: Partial<Meal>) => {
    setMealState((prev) =>
      prev ? { ...prev, ...patch, updatedAt: new Date().toISOString() } : null
    );
  };

  const addIngredient = (ingredient: Ingredient) => {
    setMealState((prev) =>
      prev
        ? {
            ...prev,
            ingredients: [...prev.ingredients, ingredient],
            updatedAt: new Date().toISOString(),
          }
        : null
    );
  };

  const removeIngredient = (index: number) => {
    setMealState((prev) =>
      prev
        ? {
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== index),
            updatedAt: new Date().toISOString(),
          }
        : null
    );
  };

  const updateIngredient = (index: number, ingredient: Ingredient) => {
    setMealState((prev) =>
      prev
        ? {
            ...prev,
            ingredients: prev.ingredients.map((ing, i) =>
              i === index ? ingredient : ing
            ),
            updatedAt: new Date().toISOString(),
          }
        : null
    );
  };

  const setType = (type: MealType) => updateMeal({ type });
  const setPhotoUrl = (url: string | null) => updateMeal({ photoUrl: url });
  const setNotes = (notes: string | null) => updateMeal({ notes });
  const setTags = (tags: string[]) => updateMeal({ tags });

  const addTag = (tag: string) => {
    setMealState((prev) =>
      prev && tag
        ? {
            ...prev,
            tags: prev.tags ? [...prev.tags, tag] : [tag],
            updatedAt: new Date().toISOString(),
          }
        : prev
    );
  };

  const removeTag = (tag: string) => {
    setMealState((prev) =>
      prev
        ? {
            ...prev,
            tags: prev.tags?.filter((t) => t !== tag) || [],
            updatedAt: new Date().toISOString(),
          }
        : prev
    );
  };

  const clearMeal = useCallback(
    (userUid: string) => {
      setMealState(null);
      removeDraft(userUid);
      clearLastScreen(userUid);
    },
    [removeDraft, clearLastScreen]
  );

  return (
    <MealDraftContext.Provider
      value={{
        meal,
        setMeal,
        updateMeal,
        clearMeal,
        addIngredient,
        removeIngredient,
        updateIngredient,
        setType,
        setPhotoUrl,
        setNotes,
        setTags,
        addTag,
        removeTag,
        isDraft,
        saveDraft,
        loadDraft,
        removeDraft,
        loadLastScreen,
        lastScreen,
        setLastScreen,
        clearLastScreen,
      }}
    >
      {children}
    </MealDraftContext.Provider>
  );
};

export const useMealDraftContext = () => useContext(MealDraftContext);

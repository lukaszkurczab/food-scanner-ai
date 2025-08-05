import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Meal, Ingredient, MealType } from "@/src/types/meal";

export const STORAGE_KEY = "current_meal_draft";
export const STORAGE_SCREEN_KEY = "current_meal_draft_screen";

export type MealContextType = {
  meal: Meal | null;
  setMeal: (meal: Meal) => void;
  updateMeal: (patch: Partial<Meal>) => void;
  clearMeal: () => void;

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
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<void>;
  removeDraft: () => Promise<void>;

  loadLastScreen: () => void;
  lastScreen: string | null;
  setLastScreen: (screen: string) => void;
  clearLastScreen: () => void;
};

const defaultMeal: Meal = {
  mealId: "",
  timestamp: "",
  type: null,
  photoUrl: null,
  notes: null,
  ingredients: [],
  createdAt: "",
  updatedAt: "",
  source: null,
  syncState: "pending",
  tags: [],
  deleted: false,
};

const MealContext = createContext<MealContextType>({
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
  loadLastScreen: () => {},
  removeTag: () => {},
  isDraft: false,
  saveDraft: async () => {},
  loadDraft: async () => {},
  removeDraft: async () => {},
  lastScreen: null,
  setLastScreen: () => {},
  clearLastScreen: () => {},
});

export const MealProvider = ({ children }: { children: React.ReactNode }) => {
  const [meal, setMealState] = useState<Meal | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  const [lastScreen, setLastScreenState] = useState<string | null>(null);

  const saveDraft = useCallback(async () => {
    if (meal) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meal));
      setIsDraft(true);
    }
  }, [meal]);

  const loadDraft = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      setMealState(JSON.parse(raw));
      setIsDraft(true);
    }
  }, []);

  const removeDraft = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setIsDraft(false);
    clearLastScreen();
  }, []);

  const clearMeal = useCallback(() => {
    setMealState(null);
    removeDraft();
    clearLastScreen();
  }, [removeDraft]);

  const setLastScreen = useCallback(async (screen: string) => {
    setLastScreenState(screen);
    await AsyncStorage.setItem(STORAGE_SCREEN_KEY, screen);
  }, []);

  const clearLastScreen = useCallback(async () => {
    setLastScreenState(null);
    await AsyncStorage.removeItem(STORAGE_SCREEN_KEY);
  }, []);

  const loadLastScreen = useCallback(async () => {
    const screen = await AsyncStorage.getItem(STORAGE_SCREEN_KEY);
    if (screen) setLastScreenState(screen);
  }, []);

  const setMeal = (meal: Meal) => {
    setMealState(meal);
  };

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

  const setType = (type: MealType) => {
    updateMeal({ type });
  };

  const setPhotoUrl = (url: string | null) => {
    updateMeal({ photoUrl: url });
  };

  const setNotes = (notes: string | null) => {
    updateMeal({ notes });
  };

  const setTags = (tags: string[]) => {
    updateMeal({ tags });
  };

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

  useEffect(() => {
    if (meal) saveDraft();
  }, [meal, saveDraft]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  return (
    <MealContext.Provider
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
    </MealContext.Provider>
  );
};

export const useMealContext = () => useContext(MealContext);

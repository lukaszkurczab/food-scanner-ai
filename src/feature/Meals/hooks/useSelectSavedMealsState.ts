import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ViewToken } from "react-native";
import type { Meal } from "@/types/meal";
import { subscribeToMyMealsOrderedByName } from "@/services/meals/myMealsRepository";
import { buildSavedMealDraft } from "@/feature/Meals/utils/buildSavedMealDraft";

const STEP = 20;
const TAIL_THRESHOLD = 10;

const normalizeText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function useSelectSavedMealsState(params: {
  uid: string | null;
  syncSavedMeals: () => Promise<void>;
  setMeal: (meal: Meal) => void;
  saveDraft: (uid: string, draftOverride?: Meal | null) => Promise<void>;
  setLastScreen: (uid: string, screen: string) => Promise<void>;
  onNavigateReview: () => void;
  onStartOver: () => void;
}) {
  const { uid, syncSavedMeals, setMeal, saveDraft, setLastScreen, onNavigateReview, onStartOver } = params;

  const [queryText, setQueryText] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Meal[]>([]);
  const [limit, setLimit] = useState(STEP);

  const loadingMoreRef = useRef(false);
  const limitRef = useRef(limit);
  const visibleCountRef = useRef(0);

  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      setLimit(STEP);
      return;
    }

    const unsub = subscribeToMyMealsOrderedByName({
      uid,
      onData: (data) => {
        setItems(data);
        setLoading(false);
        setLimit(STEP);
      },
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [uid]);

  const refresh = useCallback(async () => {
    await syncSavedMeals();
  }, [syncSavedMeals]);

  const visibleAll = useMemo(() => {
    const queryTextNormalized = normalizeText(queryText);
    const sorted = [...items].sort((a, b) => {
      const aName = normalizeText(a.name || "");
      const bName = normalizeText(b.name || "");
      if (aName && bName) return aName.localeCompare(bName);
      if (aName && !bName) return -1;
      if (!aName && bName) return 1;
      return 0;
    });
    if (!queryTextNormalized) return sorted;

    return sorted.filter((meal) => {
      const title = normalizeText(meal.name) || "";
      const ingredients = normalizeText(
        (meal.ingredients || []).map((item) => item?.name || "").join(" "),
      );
      return (
        title.includes(queryTextNormalized) ||
        ingredients.includes(queryTextNormalized)
      );
    });
  }, [items, queryText]);

  useEffect(() => {
    setLimit(STEP);
  }, [queryText]);

  const pageItems = useMemo(
    () => visibleAll.slice(0, Math.min(limit, visibleAll.length)),
    [limit, visibleAll],
  );

  useEffect(() => {
    visibleCountRef.current = visibleAll.length;
  }, [visibleAll.length]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (loadingMoreRef.current) return;
      if (limitRef.current >= visibleCountRef.current) return;

      const triggerIndex = Math.max(0, limitRef.current - TAIL_THRESHOLD);
      const reached = viewableItems.some((item) => {
        const index = typeof item.index === "number" ? item.index : -1;
        return index >= triggerIndex;
      });
      if (!reached) return;

      loadingMoreRef.current = true;
      const nextLimit = Math.min(limitRef.current + STEP, visibleCountRef.current);
      setLimit(nextLimit);
      setTimeout(() => {
        loadingMoreRef.current = false;
      }, 50);
    },
  );

  const handleAddMeal = useCallback(async (picked: Meal) => {
    if (!uid) return;

    const next = buildSavedMealDraft({
      picked,
      uid,
    });

    setMeal(next);
    await saveDraft(uid, next);
    await setLastScreen(uid, "ReviewMeal");
    onNavigateReview();
  }, [
    onNavigateReview,
    saveDraft,
    setLastScreen,
    setMeal,
    uid,
  ]);

  const handleStartOver = useCallback(() => {
    onStartOver();
  }, [onStartOver]);

  const keyExtractor = useCallback(
    (item: Meal) => item.cloudId || item.mealId,
    [],
  );

  return {
    step: STEP,
    queryText,
    setQueryText,
    loading,
    pageItems,
    refresh,
    handleAddMeal,
    handleStartOver,
    keyExtractor,
    onViewableItemsChanged,
    viewabilityConfig,
  };
}

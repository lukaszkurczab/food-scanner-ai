import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ViewToken } from "react-native";
import { v4 as uuidv4 } from "uuid";
import type { Meal } from "@/types/meal";
import { subscribeToMyMealsOrderedByName } from "@/services/meals/myMealsRepository";

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
  draftMeal: Meal | null;
  setMeal: (meal: Meal) => void;
  saveDraft: (uid: string, draftOverride?: Meal | null) => Promise<void>;
  setLastScreen: (uid: string, screen: string) => Promise<void>;
  onNavigateResult: () => void;
  onStartOver: () => void;
}) {
  const [queryText, setQueryText] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Meal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(STEP);

  const loadingMoreRef = useRef(false);
  const limitRef = useRef(limit);
  const visibleCountRef = useRef(0);

  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);

  useEffect(() => {
    if (!params.uid) {
      setItems([]);
      setLoading(false);
      setSelectedId(null);
      setLimit(STEP);
      return;
    }

    const unsub = subscribeToMyMealsOrderedByName({
      uid: params.uid,
      onData: (data) => {
        setItems(data);
        setLoading(false);
        setLimit(STEP);
      },
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [params.uid]);

  const refresh = useCallback(async () => {
    await params.syncSavedMeals();
  }, [params]);

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

  const handleSelect = useCallback((meal: Meal) => {
    const id = meal.cloudId || meal.mealId;
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!params.uid || !selectedId) return;
    const picked = visibleAll.find((meal) => (meal.cloudId || meal.mealId) === selectedId);
    if (!picked) return;

    const now = new Date().toISOString();
    const base: Meal =
      params.draftMeal ??
      {
        mealId: uuidv4(),
        userUid: params.uid,
        name: "",
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

    const next: Meal = {
      ...base,
      mealId: picked.mealId || base.mealId,
      source: "saved",
      ingredients: Array.isArray(picked.ingredients) ? picked.ingredients : [],
      photoLocalPath: picked.photoLocalPath ?? null,
      photoUrl: picked.photoLocalPath ?? picked.photoUrl ?? null,
      updatedAt: now,
      name: picked.name ?? "",
    };

    params.setMeal(next);
    await params.saveDraft(params.uid, next);
    await params.setLastScreen(params.uid, "Result");
    params.onNavigateResult();
  }, [
    params,
    selectedId,
    visibleAll,
  ]);

  const handleStartOver = useCallback(() => {
    params.onStartOver();
  }, [params]);

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
    selectedId,
    refresh,
    handleSelect,
    handleConfirm,
    handleStartOver,
    keyExtractor,
    onViewableItemsChanged,
    viewabilityConfig,
  };
}

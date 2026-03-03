import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ViewToken } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { getApp } from "@react-native-firebase/app";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  type FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import type { Meal } from "@/types/meal";
import { cacheKeys, getJSON, setJSON } from "@/services/cache";

const STEP = 20;
const TAIL_THRESHOLD = 10;

const app = getApp();
const db = getFirestore(app);

const normalizeText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function useSelectSavedMealsState(params: {
  uid: string | null;
  getMeals: () => Promise<void>;
  draftMeal: Meal | null;
  setMeal: (meal: Meal) => void;
  saveDraft: (uid: string) => Promise<void>;
  setLastScreen: (uid: string, screen: string) => Promise<void>;
  onNavigateResult: () => void;
  onStartOver: () => void;
}) {
  const { getMeals } = params;
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

    let cancelled = false;

    (async () => {
      const cached = await getJSON<Meal[]>(cacheKeys.myMealsList(params.uid!));
      if (cancelled || !cached) return;
      setItems(cached);
      setLoading(false);
    })();

    const mealsQuery = query(
      collection(db, "users", params.uid, "myMeals"),
      orderBy("name", "asc"),
    );
    const unsub = onSnapshot(mealsQuery, (snap) => {
      const data = snap.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
        ...(docSnap.data() as Meal),
        cloudId: docSnap.id,
      }));
      setItems(data);
      setLoading(false);
      setLimit(STEP);
      void setJSON(cacheKeys.myMealsList(params.uid!), data);
    });

    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [params.uid]);

  const refresh = useCallback(async () => {
    await getMeals();
  }, [getMeals]);

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
      photoUrl: picked.photoUrl ?? null,
      updatedAt: now,
      name: picked.name ?? "",
    };

    params.setMeal(next);
    await params.saveDraft(params.uid);
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

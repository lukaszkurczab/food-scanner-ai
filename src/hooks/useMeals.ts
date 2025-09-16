import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Meal } from "@/types/meal";
import {
  getMealsPageLocal,
  upsertMealLocal,
  markDeletedLocal,
} from "@/services/offline/meals.repo";
import { enqueueUpsert, enqueueDelete } from "@/services/offline/queue.repo";

const PAGE_LIMIT = 50;

function computeTotals(meal: Meal) {
  const ing = (meal.ingredients || []) as any[];
  const sum = (k: "kcal" | "protein" | "carbs" | "fat") =>
    ing.reduce((a, b) => a + (Number(b?.[k]) || 0), 0);
  return {
    kcal: sum("kcal"),
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
  };
}

function isLocalUri(u?: string | null) {
  if (!u || typeof u !== "string") return false;
  return u.startsWith("file://") || u.startsWith("content://");
}

export function useMeals(userUid: string | null) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const beforeRef = useRef<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    if (!userUid) {
      setMeals([]);
      setLoading(false);
      beforeRef.current = null;
      return;
    }
    setLoading(true);
    const page = await getMealsPageLocal(userUid, PAGE_LIMIT, undefined);
    setMeals(page);
    beforeRef.current = page.length
      ? String(page[page.length - 1].timestamp)
      : null;
    setLoading(false);
  }, [userUid]);

  const loadNextPage = useCallback(async () => {
    if (!userUid || !beforeRef.current) return;
    const page = await getMealsPageLocal(
      userUid,
      PAGE_LIMIT,
      beforeRef.current
    );
    if (!page.length) {
      beforeRef.current = null;
      return;
    }
    setMeals((prev) => [...prev, ...page]);
    beforeRef.current = String(page[page.length - 1].timestamp);
  }, [userUid]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const getMeals = useCallback(async () => {
    await loadFirstPage();
  }, [loadFirstPage]);

  const addMeal = useCallback(
    async (
      meal: Omit<Meal, "updatedAt" | "deleted">,
      _opts?: { alsoSaveToMyMeals?: boolean }
    ) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const cloudId = (meal as any).cloudId ?? uuidv4();
      const mealId = (meal as any).mealId ?? uuidv4();
      const totals = computeTotals(meal as Meal);

      const base: Meal & { photoLocalPath?: string; totals?: any } = {
        ...(meal as Meal),
        userUid,
        cloudId,
        mealId,
        createdAt: (meal as any).createdAt ?? now,
        updatedAt: now,
        deleted: false,
        source: (meal as any).source ?? "manual",
        timestamp: (meal as any).timestamp ?? now,
        totals,
      };

      const maybeUri = (meal as any).photoUrl as string | undefined;
      if (isLocalUri(maybeUri)) {
        (base as any).photoLocalPath = maybeUri;
      }

      await upsertMealLocal(base);
      await enqueueUpsert(userUid, base);
      await loadFirstPage();
    },
    [userUid, loadFirstPage]
  );

  const updateMeal = useCallback(
    async (meal: Meal) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const cloudId = meal.cloudId ?? uuidv4();
      const totals = computeTotals(meal);

      const payload: Meal & { photoLocalPath?: string; totals?: any } = {
        ...meal,
        cloudId,
        updatedAt: now,
        totals,
        timestamp: (meal as any).timestamp ?? now,
      };

      const maybeUri = (meal as any).photoUrl as string | undefined;
      if (isLocalUri(maybeUri)) {
        (payload as any).photoLocalPath = maybeUri;
      }

      await upsertMealLocal(payload);
      await enqueueUpsert(userUid, payload);
      await loadFirstPage();
    },
    [userUid, loadFirstPage]
  );

  const deleteMeal = useCallback(
    async (mealCloudId: string) => {
      if (!userUid || !mealCloudId) return;
      const now = new Date().toISOString();
      await markDeletedLocal(mealCloudId, now);
      await enqueueDelete(userUid, mealCloudId, now);
      setMeals((prev) => prev.filter((m) => (m.cloudId || "") !== mealCloudId));
    },
    [userUid]
  );

  const duplicateMeal = useCallback(
    async (original: Meal, dateOverride?: string) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const newCloudId = uuidv4();
      const newMealId = uuidv4();
      const totals = computeTotals(original);

      const copy: Meal = {
        ...original,
        userUid,
        cloudId: newCloudId,
        mealId: newMealId,
        timestamp: dateOverride || now,
        createdAt: now,
        updatedAt: now,
        deleted: false,
        totals,
      };

      await upsertMealLocal(copy);
      await enqueueUpsert(userUid, copy);
      await loadFirstPage();
    },
    [userUid, loadFirstPage]
  );

  const syncMeals = useCallback(async () => {}, []);
  const getUnsyncedMeals = useCallback(async () => {
    return [] as Meal[];
  }, []);

  return useMemo(
    () => ({
      meals,
      loading,
      getMeals,
      loadNextPage,
      addMeal,
      updateMeal,
      deleteMeal,
      duplicateMeal,
      syncMeals,
      getUnsyncedMeals,
    }),
    [
      meals,
      loading,
      getMeals,
      loadNextPage,
      addMeal,
      updateMeal,
      deleteMeal,
      duplicateMeal,
      syncMeals,
      getUnsyncedMeals,
    ]
  );
}

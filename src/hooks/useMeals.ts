import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Meal } from "@/types/meal";
import {
  getMealsPageLocal,
  upsertMealLocal,
  markDeletedLocal,
} from "@/services/offline/meals.repo";
import {
  enqueueUpsert,
  enqueueDelete,
  enqueueMyMealUpsert,
} from "@/services/offline/queue.repo";
import { insertOrUpdateImage } from "@/services/offline/images.repo";
import { reconcileAll } from "@/services/notifications/engine";
import { debugScope } from "@/utils/debug";
import { emit } from "@/services/events";
import { pushQueue, pullChanges } from "@/services/offline/sync.engine";

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

const log = debugScope("Hook:useMeals");

function triggerReconcile(uid?: string | null) {
  if (!uid) return;
  log.log("trigger reconcile", { uid });
  void reconcileAll(uid).catch((err) => {
    log.warn("reconcile failed", err);
  });
}

export function useMeals(userUid: string | null) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const beforeRef = useRef<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    console.log("[useMeals] loadFirstPage start", { userUid });
    if (!userUid) {
      setMeals([]);
      setLoading(false);
      beforeRef.current = null;
      console.log("[useMeals] no user, cleared");
      return;
    }
    setLoading(true);
    const page = await getMealsPageLocal(userUid, PAGE_LIMIT, undefined);
    setMeals(page);
    beforeRef.current = page.length
      ? String(page[page.length - 1].timestamp)
      : null;
    setLoading(false);
    console.log("[useMeals] loadFirstPage done", {
      count: page.length,
      nextBefore: beforeRef.current,
    });
  }, [userUid]);

  const loadNextPage = useCallback(async () => {
    if (!userUid || !beforeRef.current) return;
    console.log("[useMeals] loadNextPage start", {
      userUid,
      before: beforeRef.current,
    });
    const page = await getMealsPageLocal(
      userUid,
      PAGE_LIMIT,
      beforeRef.current
    );
    if (!page.length) {
      beforeRef.current = null;
      console.log("[useMeals] loadNextPage no more");
      return;
    }
    setMeals((prev) => [...prev, ...page]);
    beforeRef.current = String(page[page.length - 1].timestamp);
    console.log("[useMeals] loadNextPage appended", {
      added: page.length,
      nextBefore: beforeRef.current,
    });
  }, [userUid]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const getMeals = useCallback(async () => {
    console.log("[useMeals] getMeals");
    await loadFirstPage();
  }, [loadFirstPage]);

  const addMeal = useCallback(
    async (
      meal: Omit<Meal, "updatedAt" | "deleted">,
      _opts?: { alsoSaveToMyMeals?: boolean }
    ) => {
      if (!userUid) return;
      console.log("[useMeals] addMeal start", {
        hasPhoto: !!(meal as any).photoUrl,
      });
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
        base.photoLocalPath = maybeUri;
        console.log("[useMeals] register image for upload", {
          cloudId,
          uri: maybeUri,
        });
        await insertOrUpdateImage(userUid, cloudId, maybeUri!, "pending");
      }

      await upsertMealLocal(base);
      console.log("[useMeals] upsertMealLocal ok", { cloudId });
      emit("meal:added", { uid: userUid, meal: base });
      console.log("[useMeals] emit meal:added", { cloudId });
      await enqueueUpsert(userUid, base);
      console.log("[useMeals] enqueueUpsert ok", { cloudId });
      if (_opts?.alsoSaveToMyMeals) {
        const saved: Meal = {
          ...base,
          mealId: base.mealId,
          cloudId: base.mealId,
          source: "saved",
        } as Meal;
        await enqueueMyMealUpsert(userUid, saved);
        console.log("[useMeals] enqueueMyMealUpsert ok", { id: base.mealId });
      }

      console.log("[useMeals] pushQueue immediate");
      await pushQueue(userUid);
      console.log("[useMeals] pushQueue done -> pullChanges immediate");
      await pullChanges(userUid);
      console.log("[useMeals] pullChanges done");

      await loadFirstPage();
      console.log("[useMeals] reload after add");
      triggerReconcile(userUid);
      emit("ui:toast", { kind: "success", text: "Posiłek dodany" });
      console.log("[useMeals] addMeal done, toast fired");
    },
    [userUid, loadFirstPage]
  );

  const updateMeal = useCallback(
    async (meal: Meal) => {
      if (!userUid) return;
      console.log("[useMeals] updateMeal start", { cloudId: meal.cloudId });
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
        payload.photoLocalPath = maybeUri;
        console.log("[useMeals] register image for upload (update)", {
          cloudId,
          uri: maybeUri,
        });
        await insertOrUpdateImage(userUid, cloudId, maybeUri!, "pending");
      }

      await upsertMealLocal(payload);
      console.log("[useMeals] upsertMealLocal ok (update)", { cloudId });
      emit("meal:updated", { uid: userUid, meal: payload });
      console.log("[useMeals] emit meal:updated", { cloudId });
      await enqueueUpsert(userUid, payload);
      console.log("[useMeals] enqueueUpsert ok (update)", { cloudId });

      console.log("[useMeals] pushQueue immediate (update)");
      await pushQueue(userUid);
      console.log(
        "[useMeals] pushQueue done -> pullChanges immediate (update)"
      );
      await pullChanges(userUid);
      console.log("[useMeals] pullChanges done (update)");

      await loadFirstPage();
      console.log("[useMeals] reload after update");
      triggerReconcile(userUid);
    },
    [userUid, loadFirstPage]
  );

  const deleteMeal = useCallback(
    async (mealCloudId: string) => {
      if (!userUid || !mealCloudId) return;
      console.log("[useMeals] deleteMeal start", { cloudId: mealCloudId });
      const now = new Date().toISOString();
      await markDeletedLocal(mealCloudId, now);
      console.log("[useMeals] markDeletedLocal ok", { cloudId: mealCloudId });
      emit("meal:deleted", { uid: userUid, cloudId: mealCloudId });
      console.log("[useMeals] emit meal:deleted", { cloudId: mealCloudId });
      await enqueueDelete(userUid, mealCloudId, now);
      console.log("[useMeals] enqueueDelete ok", { cloudId: mealCloudId });

      console.log("[useMeals] pushQueue immediate (delete)");
      await pushQueue(userUid);
      console.log(
        "[useMeals] pushQueue done -> pullChanges immediate (delete)"
      );
      await pullChanges(userUid);
      console.log("[useMeals] pullChanges done (delete)");

      setMeals((prev) => prev.filter((m) => (m.cloudId || "") !== mealCloudId));
      console.log("[useMeals] local list pruned");
      triggerReconcile(userUid);
    },
    [userUid]
  );

  const duplicateMeal = useCallback(
    async (original: Meal, dateOverride?: string) => {
      if (!userUid) return;
      console.log("[useMeals] duplicateMeal start", {
        original: original.cloudId,
      });
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
      console.log("[useMeals] upsertMealLocal ok (duplicate)", {
        cloudId: newCloudId,
      });
      emit("meal:added", { uid: userUid, meal: copy });
      console.log("[useMeals] emit meal:added (duplicate)", {
        cloudId: newCloudId,
      });
      await enqueueUpsert(userUid, copy);
      console.log("[useMeals] enqueueUpsert ok (duplicate)", {
        cloudId: newCloudId,
      });

      console.log("[useMeals] pushQueue immediate (duplicate)");
      await pushQueue(userUid);
      console.log(
        "[useMeals] pushQueue done -> pullChanges immediate (duplicate)"
      );
      await pullChanges(userUid);
      console.log("[useMeals] pullChanges done (duplicate)");

      await loadFirstPage();
      console.log("[useMeals] reload after duplicate");
      triggerReconcile(userUid);
      emit("ui:toast", { kind: "success", text: "Posiłek dodany" });
      console.log("[useMeals] duplicateMeal done, toast fired");
    },
    [userUid, loadFirstPage]
  );

  const syncMeals = useCallback(async () => {
    console.log("[useMeals] syncMeals noop");
  }, []);
  const getUnsyncedMeals = useCallback(async () => {
    console.log("[useMeals] getUnsyncedMeals empty");
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import NetInfo from "@react-native-community/netinfo";
import type { Meal } from "@/types/meal";
import {
  getMealsPageLocal,
  upsertMealLocal,
  markDeletedLocal,
} from "@/services/offline/meals.repo";
import { upsertMyMealLocal } from "@/services/offline/myMeals.repo";
import {
  enqueueUpsert,
  enqueueDelete,
  enqueueMyMealUpsert,
} from "@/services/offline/queue.repo";
import { insertOrUpdateImage } from "@/services/offline/images.repo";
import { reconcileAll } from "@/services/notifications/engine";
import { debugScope } from "@/utils/debug";
import { emit } from "@/services/core/events";
import { pushQueue, pullChanges } from "@/services/offline/sync.engine";
import { upsertMyMealWithPhoto } from "@/services/meals/myMealService";
import { formatStreakDate } from "@/services/gamification/streak.logic";
import { refreshStreakFromBackend } from "@/services/gamification/streakService";

const PAGE_LIMIT = 50;
const SYNC_DEBOUNCE_MS = 1200;

function computeTotals(meal: Pick<Meal, "ingredients">) {
  const ing = meal.ingredients || [];
  const sum = (k: "kcal" | "protein" | "carbs" | "fat") =>
    ing.reduce((a, b) => a + (Number(b?.[k]) || 0), 0);
  return {
    kcal: sum("kcal"),
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
  };
}

function isLocalUri(u?: string | null): u is string {
  if (!u || typeof u !== "string") return false;
  return u.startsWith("file://") || u.startsWith("content://");
}

const log = debugScope("Hook:useMeals");

function triggerReconcile(uid?: string | null) {
  /* istanbul ignore next -- callers always pass defined uid */
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
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInFlightRef = useRef(false);
  const syncRequestedRef = useRef(false);
  const lastOfflineToastAtRef = useRef(0);

  const emitOfflineQueuedToast = useCallback(() => {
    const now = Date.now();
    if (now - lastOfflineToastAtRef.current < 8000) return;
    lastOfflineToastAtRef.current = now;
    emit("ui:toast", {
      key: "toast.savedLocallySyncLater",
      ns: "common",
    });
  }, []);

  const flushQueuedSync = useCallback(async () => {
    /* istanbul ignore next -- syncMeals/scheduler guard missing uid */
    if (!userUid) return;
    if (syncInFlightRef.current) {
      syncRequestedRef.current = true;
      return;
    }
    /* istanbul ignore next -- scheduler always marks request before flush */
    if (!syncRequestedRef.current) return;

    syncInFlightRef.current = true;
    syncRequestedRef.current = false;
    try {
      log.log("sync flush start", { uid: userUid });
      await pushQueue(userUid);
      await pullChanges(userUid);
      try {
        await refreshStreakFromBackend(userUid, { refreshBadges: true });
      } catch (error: unknown) {
        log.warn("streak refresh failed after sync", error);
      }
      triggerReconcile(userUid);
      log.log("sync flush done", { uid: userUid });
    } catch (error: unknown) {
      log.warn("sync flush failed", error);
    } finally {
      syncInFlightRef.current = false;
      if (syncRequestedRef.current && !syncTimerRef.current) {
        syncTimerRef.current = setTimeout(() => {
          syncTimerRef.current = null;
          void flushQueuedSync();
        }, SYNC_DEBOUNCE_MS);
      }
    }
  }, [userUid]);

  const scheduleQueuedSync = useCallback(
    (reason: "add" | "update" | "delete" | "duplicate") => {
      /* istanbul ignore next -- mutating actions guard missing uid */
      if (!userUid) return;
      syncRequestedRef.current = true;
      void (async () => {
        const net = await NetInfo.fetch();
        if (!net.isConnected) {
          emitOfflineQueuedToast();
          return;
        }
      })();
      if (syncTimerRef.current) {
        log.log("sync already scheduled", { uid: userUid, reason });
        return;
      }
      log.log("sync scheduled", {
        uid: userUid,
        reason,
        delayMs: SYNC_DEBOUNCE_MS,
      });
      syncTimerRef.current = setTimeout(() => {
        syncTimerRef.current = null;
        void flushQueuedSync();
      }, SYNC_DEBOUNCE_MS);
    },
    [emitOfflineQueuedToast, flushQueuedSync, userUid],
  );

  useEffect(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    syncInFlightRef.current = false;
    syncRequestedRef.current = false;
  }, [userUid]);

  useEffect(
    () => () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    },
    [],
  );

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
      beforeRef.current,
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
      _opts?: { alsoSaveToMyMeals?: boolean },
    ) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const cloudId = meal.cloudId ?? uuidv4();
      const mealId = meal.mealId ?? uuidv4();
      const totals = computeTotals(meal);

      const base: Meal = {
        ...meal,
        userUid,
        cloudId,
        mealId,
        createdAt: meal.createdAt ?? now,
        updatedAt: now,
        syncState: "pending",
        deleted: false,
        source: meal.source ?? "manual",
        timestamp: meal.timestamp ?? now,
        dayKey: meal.dayKey ?? formatStreakDate(new Date(meal.timestamp ?? now)),
        totals,
      };

      const maybeUri = meal.photoUrl;
      if (isLocalUri(maybeUri)) {
        base.photoLocalPath = maybeUri;
        await insertOrUpdateImage(
          userUid,
          cloudId,
          base.photoLocalPath,
          "pending",
        );
      }

      await upsertMealLocal(base);
      emit("meal:added", { uid: userUid, meal: base });
      await enqueueUpsert(userUid, base);
      if (_opts?.alsoSaveToMyMeals) {
        const saved: Meal = {
          ...base,
          mealId: base.mealId,
          cloudId: base.mealId,
          source: "saved",
        };
        await upsertMyMealLocal(saved);
        await enqueueMyMealUpsert(userUid, saved);
      }

      scheduleQueuedSync("add");

      await loadFirstPage();
      emit("ui:toast", { key: "toast.mealAdded", ns: "common" });
    },
    [userUid, loadFirstPage, scheduleQueuedSync],
  );

  const updateMeal = useCallback(
    async (meal: Meal) => {
      if (!userUid) return;

      if (meal.source === "saved") {
        const now = new Date().toISOString();
        const docId = meal.mealId || meal.cloudId || uuidv4();
        const localPhoto = isLocalUri(meal.photoUrl)
          ? (meal.photoUrl as string)
          : null;
        const toSave: Meal = {
          ...meal,
          userUid,
          mealId: docId,
          cloudId: docId,
          updatedAt: now,
          photoLocalPath: localPhoto,
        };
        await upsertMyMealWithPhoto(userUid, toSave, localPhoto);
        emit("meal:updated", { uid: userUid, meal: toSave });
        return;
      }

      const now = new Date().toISOString();
      const cloudId = meal.cloudId ?? uuidv4();
      const totals = computeTotals(meal);

      const payload: Meal = {
        ...meal,
        cloudId,
        updatedAt: now,
        syncState: "pending",
        totals,
        timestamp: meal.timestamp ?? now,
        dayKey: meal.dayKey ?? formatStreakDate(new Date(meal.timestamp ?? now)),
      };

      const maybeUri = meal.photoUrl;
      if (isLocalUri(maybeUri)) {
        payload.photoLocalPath = maybeUri;
        await insertOrUpdateImage(
          userUid,
          cloudId,
          payload.photoLocalPath,
          "pending",
        );
      }

      await upsertMealLocal(payload);
      emit("meal:updated", { uid: userUid, meal: payload });
      await enqueueUpsert(userUid, payload);

      scheduleQueuedSync("update");

      await loadFirstPage();
    },
    [userUid, loadFirstPage, scheduleQueuedSync],
  );

  const deleteMeal = useCallback(
    async (mealCloudId: string) => {
      if (!userUid || !mealCloudId) return;
      const now = new Date().toISOString();
      await markDeletedLocal(mealCloudId, now);
      emit("meal:deleted", { uid: userUid, cloudId: mealCloudId });
      await enqueueDelete(userUid, mealCloudId, now);

      scheduleQueuedSync("delete");

      setMeals((prev) => prev.filter((m) => (m.cloudId || "") !== mealCloudId));
    },
    [userUid, scheduleQueuedSync],
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
        syncState: "pending",
        deleted: false,
        totals,
      };

      await upsertMealLocal(copy);
      emit("meal:added", { uid: userUid, meal: copy });
      await enqueueUpsert(userUid, copy);

      scheduleQueuedSync("duplicate");

      await loadFirstPage();
      emit("ui:toast", { key: "toast.mealAdded", ns: "common" });
    },
    [userUid, loadFirstPage, scheduleQueuedSync],
  );

  const syncMeals = useCallback(async () => {
    if (!userUid) return;
    syncRequestedRef.current = true;
    await flushQueuedSync();
  }, [flushQueuedSync, userUid]);
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
    ],
  );
}

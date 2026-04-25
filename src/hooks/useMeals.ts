import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import NetInfo from "@react-native-community/netinfo";
import type { Meal } from "@/types/meal";
import {
  upsertMealLocal,
  markDeletedLocal,
  getPendingMealsLocal,
} from "@/services/offline/meals.repo";
import {
  enqueueUpsert,
  enqueueDelete,
} from "@/services/offline/queue.repo";
import { insertOrUpdateImage } from "@/services/offline/images.repo";
import { reconcileAll } from "@/services/notifications/engine";
import { debugScope } from "@/utils/debug";
import { emit } from "@/services/core/events";
import { isOfflineNetState } from "@/services/core/networkState";
import { pushQueue, pullChanges } from "@/services/offline/sync.engine";
import { upsertMyMealWithPhoto } from "@/services/meals/myMealService";
import {
  deriveMealTimingMetadata,
  formatMealDayKey,
  normalizeMealDayKey,
} from "@/services/meals/mealMetadata";
import { refreshStreakFromBackend } from "@/services/gamification/streakService";
import {
  saveMealTransaction,
  type SavedMealTemplateSave,
} from "@/services/meals/mealSaveTransaction";
import {
  getLocalMealsSnapshot,
  removeLocalMealSnapshot,
  refreshLocalMeals,
  subscribeLocalMeals,
  upsertLocalMealSnapshot,
} from "@/services/meals/localMealsStore";

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

function withDerivedMealFields(meal: Meal, fallbackIso: string): Meal {
  const timestamp = meal.timestamp ?? fallbackIso;
  const timingMetadata = deriveMealTimingMetadata(timestamp);
  const dayKey =
    normalizeMealDayKey(meal.dayKey) ??
    formatMealDayKey(new Date(timestamp)) ??
    formatMealDayKey(new Date(fallbackIso));
  return {
    ...meal,
    timestamp,
    dayKey: dayKey ?? fallbackIso.slice(0, 10),
    loggedAtLocalMin: meal.loggedAtLocalMin ?? timingMetadata.loggedAtLocalMin,
    tzOffsetMin: meal.tzOffsetMin ?? timingMetadata.tzOffsetMin,
    totals: computeTotals(meal),
    inputMethod:
      meal.inputMethod ??
      (meal.source === "manual" || meal.source === null ? "manual" : null),
  };
}

function omitDraftOnlyFields(meal: Meal): Meal {
  const { savedMealRefId: _savedMealRefId, ...persistable } = meal;
  return persistable;
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
  const [snapshot, setSnapshot] = useState(() => getLocalMealsSnapshot(userUid));
  const hookInstanceIdRef = useRef(`useMeals-${Math.random().toString(36).slice(2)}`);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInFlightRef = useRef(false);
  const syncRequestedRef = useRef(false);
  const syncPullRequestedRef = useRef(false);
  const lastOfflineToastAtRef = useRef(0);
  const remoteRefreshInFlightRef = useRef(false);
  const meals = snapshot.meals;
  const loading = snapshot.loading;

  const emitOfflineQueuedToast = useCallback(() => {
    const now = Date.now();
    if (now - lastOfflineToastAtRef.current < 8000) return;
    lastOfflineToastAtRef.current = now;
    emit("ui:toast", {
      key: "toast.savedLocallySyncLater",
      ns: "common",
    });
  }, []);

  const flushQueuedSync = useCallback(async (options?: { pullAfterPush?: boolean }) => {
    /* istanbul ignore next -- syncMeals/scheduler guard missing uid */
    if (!userUid) return;
    if (options?.pullAfterPush) {
      syncPullRequestedRef.current = true;
    }
    if (syncInFlightRef.current) {
      syncRequestedRef.current = true;
      return;
    }
    /* istanbul ignore next -- scheduler always marks request before flush */
    if (!syncRequestedRef.current) return;

    syncInFlightRef.current = true;
    syncRequestedRef.current = false;
    const shouldPullAfterPush = syncPullRequestedRef.current;
    syncPullRequestedRef.current = false;
    try {
      log.log("sync flush start", { uid: userUid });
      await pushQueue(userUid);
      if (shouldPullAfterPush) {
        await pullChanges(userUid);
      }
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
        if (isOfflineNetState(net)) {
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
    syncPullRequestedRef.current = false;
  }, [userUid]);

  useEffect(() => {
    setSnapshot(getLocalMealsSnapshot(userUid));
    return subscribeLocalMeals(userUid, () => {
      setSnapshot(getLocalMealsSnapshot(userUid));
    });
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

  const loadNextPage = useCallback(async () => {
    await refreshLocalMeals(userUid);
  }, [userUid]);

  const getMeals = useCallback(async () => {
    await refreshLocalMeals(userUid);
  }, [userUid]);

  useEffect(() => {
    if (!userUid) {
      remoteRefreshInFlightRef.current = false;
      return;
    }

    let cancelled = false;

    void (async () => {
      const net = await NetInfo.fetch();
      if (
        cancelled ||
        isOfflineNetState(net) ||
        remoteRefreshInFlightRef.current
      ) {
        return;
      }

      remoteRefreshInFlightRef.current = true;
      try {
        await pullChanges(userUid);
      } catch (error: unknown) {
        log.warn("background pull failed", error);
      } finally {
        remoteRefreshInFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      remoteRefreshInFlightRef.current = false;
    };
  }, [userUid]);

  const addMeal = useCallback(
    async (meal: Omit<Meal, "updatedAt" | "deleted">) => {
      if (!userUid) return;
      const { meal: savedMeal } = await saveMealTransaction({
        uid: userUid,
        meal: meal as Meal,
      });
      upsertLocalMealSnapshot(userUid, savedMeal);

      scheduleQueuedSync("add");
      emit("ui:toast", { key: "toast.mealAdded", ns: "common" });
    },
    [userUid, scheduleQueuedSync],
  );

  const saveMeal = useCallback(
    async (params: {
      meal: Meal;
      savedTemplate?: SavedMealTemplateSave;
    }): Promise<Meal | null> => {
      if (!userUid) return null;
      const { meal: savedMeal } = await saveMealTransaction({
        uid: userUid,
        meal: params.meal,
        savedTemplate: params.savedTemplate,
      });
      upsertLocalMealSnapshot(userUid, savedMeal);

      scheduleQueuedSync("add");
      emit("ui:toast", { key: "toast.mealAdded", ns: "common" });
      return savedMeal;
    },
    [scheduleQueuedSync, userUid],
  );

  const createSavedMealTemplate = useCallback(
    async (meal: Meal) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const persistableMeal = omitDraftOnlyFields(meal);
      const docId = persistableMeal.mealId || persistableMeal.cloudId || uuidv4();
      const localPhoto = isLocalUri(persistableMeal.photoUrl)
        ? persistableMeal.photoUrl
        : null;
      const toSave: Meal = {
        ...persistableMeal,
        userUid,
        mealId: docId,
        cloudId: docId,
        source: "saved",
        inputMethod: "saved",
        updatedAt: now,
      };
      await upsertMyMealWithPhoto(userUid, toSave, localPhoto);
    },
    [userUid],
  );

  const updateSavedMealTemplate = useCallback(
    async (templateId: string, meal: Meal) => {
      if (!userUid || !templateId) return;
      const now = new Date().toISOString();
      const persistableMeal = omitDraftOnlyFields(meal);
      const localPhoto = isLocalUri(persistableMeal.photoUrl)
        ? persistableMeal.photoUrl
        : null;
      const toSave: Meal = {
        ...persistableMeal,
        userUid,
        mealId: templateId,
        cloudId: templateId,
        source: "saved",
        inputMethod: "saved",
        updatedAt: now,
      };
      await upsertMyMealWithPhoto(userUid, toSave, localPhoto);
    },
    [userUid],
  );

  const updateMeal = useCallback(
    async (meal: Meal) => {
      if (!userUid) return;
      const persistableMeal = omitDraftOnlyFields(meal);

      if (persistableMeal.source === "saved") {
        const now = new Date().toISOString();
        const docId = persistableMeal.mealId || persistableMeal.cloudId || uuidv4();
        const localPhoto = isLocalUri(persistableMeal.photoUrl)
          ? (persistableMeal.photoUrl as string)
          : null;
        const toSave: Meal = {
          ...persistableMeal,
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
      const cloudId = persistableMeal.cloudId ?? uuidv4();
      const timestamp = persistableMeal.timestamp ?? now;

      const payload = withDerivedMealFields({
        ...persistableMeal,
        cloudId,
        updatedAt: now,
        syncState: "pending",
        timestamp,
      }, now);

      const maybeUri = persistableMeal.photoUrl;
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
      upsertLocalMealSnapshot(userUid, payload);
      emit("meal:updated", { uid: userUid, meal: payload });
      await enqueueUpsert(userUid, payload);

      scheduleQueuedSync("update");
    },
    [userUid, scheduleQueuedSync],
  );

  const deleteMeal = useCallback(
    async (mealCloudId: string) => {
      if (!userUid || !mealCloudId) return;
      const now = new Date().toISOString();
      await markDeletedLocal(mealCloudId, now);
      removeLocalMealSnapshot(userUid, mealCloudId);
      emit("meal:deleted", {
        uid: userUid,
        cloudId: mealCloudId,
        sourceHookId: hookInstanceIdRef.current,
      });
      await enqueueDelete(userUid, mealCloudId, now);

      scheduleQueuedSync("delete");
    },
    [userUid, scheduleQueuedSync],
  );

  const duplicateMeal = useCallback(
    async (original: Meal, dateOverride?: string) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const newCloudId = uuidv4();
      const newMealId = uuidv4();

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
      };
      const { meal: savedCopy } = await saveMealTransaction({
        uid: userUid,
        meal: copy,
        nowISO: now,
      });
      upsertLocalMealSnapshot(userUid, savedCopy);

      scheduleQueuedSync("duplicate");
      emit("ui:toast", { key: "toast.mealAdded", ns: "common" });
    },
    [userUid, scheduleQueuedSync],
  );

  const syncMeals = useCallback(async () => {
    if (!userUid) return;
    syncRequestedRef.current = true;
    await flushQueuedSync({ pullAfterPush: true });
  }, [flushQueuedSync, userUid]);
  const getUnsyncedMeals = useCallback(async () => {
    if (!userUid) return [] as Meal[];
    return getPendingMealsLocal(userUid);
  }, [userUid]);

  return useMemo(
    () => ({
      meals,
      loading,
      getMeals,
      loadNextPage,
      addMeal,
      saveMeal,
      createSavedMealTemplate,
      updateSavedMealTemplate,
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
      saveMeal,
      createSavedMealTemplate,
      updateSavedMealTemplate,
      updateMeal,
      deleteMeal,
      duplicateMeal,
      syncMeals,
      getUnsyncedMeals,
    ],
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import NetInfo from "@react-native-community/netinfo";
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
import { upsertMyMealWithPhoto } from "@/services/myMealService";

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

  const emitSyncStatus = useCallback(
    (status: "idle" | "queued" | "syncing" | "offline") => {
      if (!userUid) return;
      emit("sync:status", { uid: userUid, status });
    },
    [userUid]
  );

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
    if (!userUid) return;
    if (syncInFlightRef.current) {
      syncRequestedRef.current = true;
      return;
    }
    if (!syncRequestedRef.current) return;

    syncInFlightRef.current = true;
    syncRequestedRef.current = false;
    emitSyncStatus("syncing");
    try {
      log.log("sync flush start", { uid: userUid });
      await pushQueue(userUid);
      await pullChanges(userUid);
      log.log("sync flush done", { uid: userUid });
      const net = await NetInfo.fetch();
      emitSyncStatus(net.isConnected ? "idle" : "offline");
    } catch (error: unknown) {
      log.warn("sync flush failed", error);
      const net = await NetInfo.fetch();
      emitSyncStatus(net.isConnected ? "queued" : "offline");
    } finally {
      syncInFlightRef.current = false;
      if (syncRequestedRef.current && !syncTimerRef.current) {
        emitSyncStatus("queued");
        syncTimerRef.current = setTimeout(() => {
          syncTimerRef.current = null;
          void flushQueuedSync();
        }, SYNC_DEBOUNCE_MS);
      }
    }
  }, [emitSyncStatus, userUid]);

  const scheduleQueuedSync = useCallback(
    (reason: "add" | "update" | "delete" | "duplicate") => {
      if (!userUid) return;
      syncRequestedRef.current = true;
      void (async () => {
        const net = await NetInfo.fetch();
        if (!net.isConnected) {
          emitSyncStatus("offline");
          emitOfflineQueuedToast();
          return;
        }
        emitSyncStatus("queued");
      })();
      if (syncTimerRef.current) {
        log.log("sync already scheduled", { uid: userUid, reason });
        return;
      }
      log.log("sync scheduled", { uid: userUid, reason, delayMs: SYNC_DEBOUNCE_MS });
      syncTimerRef.current = setTimeout(() => {
        syncTimerRef.current = null;
        void flushQueuedSync();
      }, SYNC_DEBOUNCE_MS);
    },
    [emitOfflineQueuedToast, emitSyncStatus, flushQueuedSync, userUid]
  );

  useEffect(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    syncInFlightRef.current = false;
    syncRequestedRef.current = false;
    emitSyncStatus("idle");
  }, [userUid]);

  useEffect(
    () => () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      emitSyncStatus("idle");
    },
    [emitSyncStatus]
  );

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
        hasPhoto: !!meal.photoUrl,
      });
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
        deleted: false,
        source: meal.source ?? "manual",
        timestamp: meal.timestamp ?? now,
        totals,
      };

      const maybeUri = meal.photoUrl;
      if (isLocalUri(maybeUri)) {
        base.photoLocalPath = maybeUri;
        console.log("[useMeals] register image for upload", {
          cloudId,
          uri: maybeUri,
        });
        await insertOrUpdateImage(
          userUid,
          cloudId,
          base.photoLocalPath,
          "pending"
        );
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
        };
        await enqueueMyMealUpsert(userUid, saved);
        console.log("[useMeals] enqueueMyMealUpsert ok", { id: base.mealId });
      }

      scheduleQueuedSync("add");

      await loadFirstPage();
      console.log("[useMeals] reload after add");
      triggerReconcile(userUid);
      emit("ui:toast", { key: "toast.mealAdded", ns: "common" });
      console.log("[useMeals] addMeal done, toast fired");
    },
    [userUid, loadFirstPage, scheduleQueuedSync]
  );

  const updateMeal = useCallback(
    async (meal: Meal) => {
      if (!userUid) return;
      console.log("[useMeals] updateMeal start", {
        cloudId: meal.cloudId,
        source: meal.source,
      });

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
        };
        await upsertMyMealWithPhoto(userUid, toSave, localPhoto);
        emit("meal:updated", { uid: userUid, meal: toSave });
        triggerReconcile(userUid);
        return;
      }

      const now = new Date().toISOString();
      const cloudId = meal.cloudId ?? uuidv4();
      const totals = computeTotals(meal);

      const payload: Meal = {
        ...meal,
        cloudId,
        updatedAt: now,
        totals,
        timestamp: meal.timestamp ?? now,
      };

      const maybeUri = meal.photoUrl;
      if (isLocalUri(maybeUri)) {
        payload.photoLocalPath = maybeUri;
        console.log("[useMeals] register image for upload (update)", {
          cloudId,
          uri: maybeUri,
        });
        await insertOrUpdateImage(
          userUid,
          cloudId,
          payload.photoLocalPath,
          "pending"
        );
      }

      await upsertMealLocal(payload);
      console.log("[useMeals] upsertMealLocal ok (update)", { cloudId });
      emit("meal:updated", { uid: userUid, meal: payload });
      console.log("[useMeals] emit meal:updated", { cloudId });
      await enqueueUpsert(userUid, payload);
      console.log("[useMeals] enqueueUpsert ok (update)", { cloudId });

      scheduleQueuedSync("update");

      await loadFirstPage();
      console.log("[useMeals] reload after update");
      triggerReconcile(userUid);
    },
    [userUid, loadFirstPage, scheduleQueuedSync]
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

      scheduleQueuedSync("delete");

      setMeals((prev) => prev.filter((m) => (m.cloudId || "") !== mealCloudId));
      console.log("[useMeals] local list pruned");
      triggerReconcile(userUid);
    },
    [userUid, scheduleQueuedSync]
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

      scheduleQueuedSync("duplicate");

      await loadFirstPage();
      console.log("[useMeals] reload after duplicate");
      triggerReconcile(userUid);
      emit("ui:toast", { key: "toast.mealAdded", ns: "common" });
      console.log("[useMeals] duplicateMeal done, toast fired");
    },
    [userUid, loadFirstPage, scheduleQueuedSync]
  );

  const syncMeals = useCallback(async () => {
    if (!userUid) return;
    syncRequestedRef.current = true;
    await flushQueuedSync();
  }, [flushQueuedSync, userUid]);
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

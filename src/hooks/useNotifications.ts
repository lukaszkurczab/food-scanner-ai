import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
} from "@react-native-firebase/firestore";
import type { UserNotification } from "@/types/notification";

export function useNotifications(uid: string | null) {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    const app = getApp();
    const db = getFirestore(app);
    const unsub = onSnapshot(
      collection(db, "users", uid, "notifications"),
      (snap) => {
        const arr = snap.docs.map((d: any) => ({
          id: d.id,
          ...(d.data() as any),
        })) as UserNotification[];
        setItems(arr);
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  const create = useCallback(
    async (
      uidLocal: string,
      data: Omit<UserNotification, "id" | "createdAt" | "updatedAt">
    ) => {
      const app = getApp();
      const db = getFirestore(app);
      const id = uuidv4();
      const now = Date.now();
      await setDoc(
        doc(db, "users", uidLocal, "notifications", id),
        {
          ...data,
          id,
          createdAt: now,
          updatedAt: now,
        } as any,
        { merge: true }
      );
      return id;
    },
    []
  );

  const update = useCallback(
    async (uidLocal: string, id: string, patch: Partial<UserNotification>) => {
      const app = getApp();
      const db = getFirestore(app);
      const now = Date.now();
      await setDoc(
        doc(db, "users", uidLocal, "notifications", id),
        { ...patch, updatedAt: now } as any,
        { merge: true }
      );
    },
    []
  );

  const remove = useCallback(async (uidLocal: string, id: string) => {
    const app = getApp();
    const db = getFirestore(app);
    await deleteDoc(doc(db, "users", uidLocal, "notifications", id));
  }, []);

  const toggle = useCallback(
    async (uidLocal: string, id: string, enabled: boolean) => {
      await update(uidLocal, id, { enabled });
    },
    [update]
  );

  const loadMotivationPrefs = useCallback(async (uidLocal: string) => {
    try {
      const db = getFirestore(getApp());
      const ref = doc(db, "users", uidLocal, "prefs", "global");
      const snap = await getDoc(ref);

      const data = snap.exists() ? (snap.data() as any) : {};
      const enabled = !!data?.notifications?.motivationEnabled;
      return { enabled };
    } catch (e) {
      console.error("❌ loadMotivationPrefs error:", e);
      return { enabled: false };
    }
  }, []);

  const loadStatsPrefs = useCallback(async (uidLocal: string) => {
    try {
      const db = getFirestore(getApp());
      const ref = doc(db, "users", uidLocal, "prefs", "global");
      const snap = await getDoc(ref);

      const data = snap.exists() ? (snap.data() as any) : {};
      const enabled = !!data?.notifications?.statsEnabled;
      return { enabled };
    } catch (e) {
      console.error("❌ loadStatsPrefs error:", e);
      return { enabled: false };
    }
  }, []);

  const setMotivationPrefs = useCallback(
    async (uidLocal: string, enabled: boolean) => {
      try {
        const db = getFirestore(getApp());
        const ref = doc(db, "users", uidLocal, "prefs", "global");
        await setDoc(
          ref,
          { notifications: { motivationEnabled: enabled } },
          { merge: true }
        );
      } catch (e) {
        console.error("❌ setMotivationPrefs error:", e);
      }
    },
    []
  );

  const setStatsPrefs = useCallback(
    async (uidLocal: string, enabled: boolean) => {
      try {
        const db = getFirestore(getApp());
        const ref = doc(db, "users", uidLocal, "prefs", "global");
        console.log("✍️ setStatsPrefs path:", ref.path, "value:", enabled);
        await setDoc(
          ref,
          { notifications: { statsEnabled: enabled } },
          { merge: true }
        );
        console.log("✅ setStatsPrefs success");
      } catch (e) {
        console.error("❌ setStatsPrefs error:", e);
      }
    },
    []
  );

  return useMemo(
    () => ({
      items,
      loading,
      create,
      update,
      remove,
      toggle,
      loadMotivationPrefs,
      setMotivationPrefs,
      setStatsPrefs,
      loadStatsPrefs,
    }),
    [
      items,
      loading,
      create,
      update,
      remove,
      toggle,
      loadMotivationPrefs,
      setMotivationPrefs,
      setStatsPrefs,
      loadStatsPrefs,
    ]
  );
}

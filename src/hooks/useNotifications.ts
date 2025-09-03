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
import type { UserNotification, MotivationMode } from "@/types/notification";
import { reconcileAll } from "@/services/notifications/engine";

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
      await reconcileAll(uidLocal);
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
      await reconcileAll(uidLocal);
    },
    []
  );

  const remove = useCallback(async (uidLocal: string, id: string) => {
    const app = getApp();
    const db = getFirestore(app);
    await deleteDoc(doc(db, "users", uidLocal, "notifications", id));
    await reconcileAll(uidLocal);
  }, []);

  const toggle = useCallback(
    async (uidLocal: string, id: string, enabled: boolean) => {
      await update(uidLocal, id, { enabled });
    },
    [update]
  );

  const loadMotivationPrefs = useCallback(async (uidLocal: string) => {
    const db = getFirestore(getApp());
    const snap = await getDoc(doc(db, "users", uidLocal, "prefs"));
    const data = snap.exists() ? (snap.data() as any) : {};
    const enabled = !!data?.notifications?.motivationEnabled;
    const mode: MotivationMode =
      data?.notifications?.motivationMode || "minimal";
    return { enabled, mode };
  }, []);

  const setMotivationPrefs = useCallback(
    async (uidLocal: string, enabled: boolean, mode: MotivationMode) => {
      const db = getFirestore(getApp());
      await setDoc(
        doc(db, "users", uidLocal, "prefs"),
        {
          notifications: { motivationEnabled: enabled, motivationMode: mode },
        } as any,
        { merge: true }
      );
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
    ]
  );
}

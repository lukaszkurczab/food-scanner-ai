// src/hooks/useNotifications.ts
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
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import type { UserNotification } from "@/types/notification";
import AsyncStorage from "@react-native-async-storage/async-storage";

type GlobalPrefsDoc = {
  notifications?: {
    motivationEnabled?: boolean;
    statsEnabled?: boolean;
  };
};

type BoolPrefs = { enabled: boolean };

function parseCachedBoolPrefs(cached: string | null): BoolPrefs | null {
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as Partial<BoolPrefs>;
    return { enabled: !!parsed.enabled };
  } catch {
    return null;
  }
}

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
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(`notif:list:${uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setItems(parsed as UserNotification[]);
        }
      } catch {
        // Ignore malformed cache and continue with fresh data.
      }
      setLoading(false);
    })();

    const unsub = onSnapshot(
      collection(db, "users", uid, "notifications"),
      (snap) => {
        const arr: UserNotification[] = snap.docs.map(
          (d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
          id: d.id,
          ...(d.data() as Omit<UserNotification, "id">),
          })
        );
        setItems(arr);
        AsyncStorage.setItem(`notif:list:${uid}`, JSON.stringify(arr)).catch(
          () => {}
        );
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
      const payload: UserNotification = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(
        doc(db, "users", uidLocal, "notifications", id),
        payload,
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
      const payload: Partial<UserNotification> & Pick<UserNotification, "updatedAt"> = {
        ...patch,
        updatedAt: now,
      };
      await setDoc(
        doc(db, "users", uidLocal, "notifications", id),
        payload,
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

      const data = (snap.exists() ? snap.data() : {}) as GlobalPrefsDoc;
      const enabled = !!data?.notifications?.motivationEnabled;
      await AsyncStorage.setItem(
        `notif:prefs:${uidLocal}:motivation`,
        JSON.stringify({ enabled })
      );
      return { enabled };
    } catch {
      try {
        const cached = await AsyncStorage.getItem(
          `notif:prefs:${uidLocal}:motivation`
        );
        const parsed = parseCachedBoolPrefs(cached);
        if (parsed) return parsed;
      } catch {
        // Ignore malformed local cache fallback.
      }
      return { enabled: false };
    }
  }, []);

  const loadStatsPrefs = useCallback(async (uidLocal: string) => {
    try {
      const db = getFirestore(getApp());
      const ref = doc(db, "users", uidLocal, "prefs", "global");
      const snap = await getDoc(ref);

      const data = (snap.exists() ? snap.data() : {}) as GlobalPrefsDoc;
      const enabled = !!data?.notifications?.statsEnabled;
      await AsyncStorage.setItem(
        `notif:prefs:${uidLocal}:stats`,
        JSON.stringify({ enabled })
      );
      return { enabled };
    } catch {
      try {
        const cached = await AsyncStorage.getItem(
          `notif:prefs:${uidLocal}:stats`
        );
        const parsed = parseCachedBoolPrefs(cached);
        if (parsed) return parsed;
      } catch {
        // Ignore malformed local cache fallback.
      }
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
        await AsyncStorage.setItem(
          `notif:prefs:${uidLocal}:motivation`,
          JSON.stringify({ enabled })
        );
      } catch {
        await AsyncStorage.setItem(
          `notif:prefs:${uidLocal}:motivation`,
          JSON.stringify({ enabled })
        );
      }
    },
    []
  );

  const setStatsPrefs = useCallback(
    async (uidLocal: string, enabled: boolean) => {
      try {
        const db = getFirestore(getApp());
        const ref = doc(db, "users", uidLocal, "prefs", "global");
        await setDoc(
          ref,
          { notifications: { statsEnabled: enabled } },
          { merge: true }
        );
        await AsyncStorage.setItem(
          `notif:prefs:${uidLocal}:stats`,
          JSON.stringify({ enabled })
        );
      } catch {
        await AsyncStorage.setItem(
          `notif:prefs:${uidLocal}:stats`,
          JSON.stringify({ enabled })
        );
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

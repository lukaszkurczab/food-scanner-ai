import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  runTransaction,
  getDoc,
  setDoc,
  onSnapshot,
} from "@react-native-firebase/firestore";
import {
  INIT_STREAK,
  formatStreakDate,
  hasReachedStreakThreshold,
  isSameStreakDay,
  missedSinceStreakDay,
  sanitizeStreakDoc,
} from "./streak.logic";
import { debugScope } from "@/utils/debug";
import type { StreakDoc } from "./streak.logic";
export type { StreakDoc } from "./streak.logic";

const app = getApp();
const db = getFirestore(app);
const log = debugScope("StreakService");

export async function ensureStreakDoc(uid: string) {
  const ref = doc(db, "users", uid, "streak", "main");
  const snap = await getDoc(ref);
  if (!snap.exists) {
    await setDoc(ref, INIT_STREAK);
    return INIT_STREAK;
  }
  const normalized = sanitizeStreakDoc(snap.data());
  if (!normalized) {
    await setDoc(ref, INIT_STREAK, { merge: true });
    return INIT_STREAK;
  }
  return normalized;
}

export async function resetIfMissed(uid: string, now: Date = new Date()) {
  const today = formatStreakDate(now);
  const ref = doc(db, "users", uid, "streak", "main");
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, INIT_STREAK);
      return;
    }
    const data = sanitizeStreakDoc(snap.data());
    if (!data) {
      tx.set(ref, INIT_STREAK, { merge: true });
      return;
    }
    const miss = missedSinceStreakDay(data.lastDate, today);

    if (miss) {
      tx.update(ref, { current: 0 });
    }
  });
}

export async function updateStreakIfThresholdMet(params: {
  uid: string;
  todaysKcal: number;
  targetKcal: number;
  now?: Date;
  thresholdPct?: number;
}) {
  const { uid, todaysKcal, targetKcal } = params;
  const now = params.now ?? new Date();
  const thresholdPct = params.thresholdPct ?? 0.8;

  const reached = hasReachedStreakThreshold({
    consumedKcal: todaysKcal,
    targetKcal,
    thresholdPct,
  });
  if (!reached) return;

  const today = formatStreakDate(now);
  const ref = doc(db, "users", uid, "streak", "main");

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, { current: 1, lastDate: today });
      return;
    }
    const data = sanitizeStreakDoc(snap.data());
    if (!data) {
      tx.set(ref, { current: 1, lastDate: today }, { merge: true });
      return;
    }
    if (isSameStreakDay(data.lastDate, today)) {
      return;
    }
    if (missedSinceStreakDay(data.lastDate, today)) {
      tx.update(ref, { current: 1, lastDate: today });
    } else {
      const next = (data.current || 0) + 1;
      tx.update(ref, { current: next, lastDate: today });
    }
  });
}

export async function getStreak(uid: string) {
  const ref = doc(db, "users", uid, "streak", "main");
  const snap = await getDoc(ref);
  if (!snap.exists) {
    return INIT_STREAK;
  }
  const d = sanitizeStreakDoc(snap.data()) || INIT_STREAK;
  return d;
}

export function subscribeStreak(
  uid: string,
  cb: (data: StreakDoc) => void
) {
  const ref = doc(db, "users", uid, "streak", "main");
  return onSnapshot(
    ref,
    (snap) => {
      const d = sanitizeStreakDoc(snap.data()) || INIT_STREAK;
      cb(d);
    },
    (e) => {
      log.error("subscribeStreak error", { uid, error: e });
    }
  );
}

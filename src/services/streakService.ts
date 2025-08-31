import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  runTransaction,
  getDoc,
  setDoc,
  onSnapshot,
} from "@react-native-firebase/firestore";

const app = getApp();
const db = getFirestore(app);

export type StreakDoc = {
  current: number;
  lastDate: string | null;
};

const INIT: StreakDoc = { current: 0, lastDate: null };

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const isSameDay = (a: string | null, b: string) => !!a && a === b;

const missedSince = (last: string | null, today: string) => {
  if (!last) return true;
  const [y1, m1, d1] = last.split("-").map((n) => parseInt(n, 10));
  const [y2, m2, d2] = today.split("-").map((n) => parseInt(n, 10));
  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  const diffDays = Math.floor((t2 - t1) / 86400000);
  return diffDays >= 2;
};

const sanitize = (raw: any): StreakDoc | null => {
  if (!raw || typeof raw !== "object") return null;
  const cur =
    typeof raw.current === "number" && raw.current >= 0 ? raw.current : null;
  const ld =
    raw.lastDate == null
      ? null
      : typeof raw.lastDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(raw.lastDate)
      ? raw.lastDate
      : undefined;
  if (cur === null || ld === undefined) return null;
  return { current: cur, lastDate: ld };
};

export async function ensureStreakDoc(uid: string) {
  const ref = doc(db, "users", uid, "streak", "main");
  console.log("[streakService] ensureStreakDoc", { uid, path: ref.path });
  const snap = await getDoc(ref);
  if (!snap.exists) {
    await setDoc(ref, INIT);
    console.log("[streakService] ensureStreakDoc created", INIT);
    return INIT;
  }
  const normalized = sanitize(snap.data());
  if (!normalized) {
    await setDoc(ref, INIT, { merge: true });
    console.log("[streakService] ensureStreakDoc normalized -> INIT");
    return INIT;
  }
  console.log("[streakService] ensureStreakDoc ok", normalized);
  return normalized;
}

export async function resetIfMissed(uid: string, now: Date = new Date()) {
  const today = fmt(now);
  const ref = doc(db, "users", uid, "streak", "main");
  console.log("[streakService] resetIfMissed", { uid, today, path: ref.path });
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, INIT);
      console.log("[streakService] resetIfMissed init");
      return;
    }
    const data = sanitize(snap.data());
    if (!data) {
      tx.set(ref, INIT, { merge: true });
      console.log("[streakService] resetIfMissed normalize -> INIT");
      return;
    }
    const miss = missedSince(data.lastDate, today);
    console.log("[streakService] resetIfMissed check", {
      lastDate: data.lastDate,
      miss,
    });
    if (miss) {
      tx.update(ref, { current: 0 });
      console.log("[streakService] resetIfMissed -> reset");
    }
  });
  console.log("[streakService] resetIfMissed done");
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
  console.log("[streakService] updateStreakIfThresholdMet input", {
    uid,
    todaysKcal,
    targetKcal,
    thresholdPct,
  });
  if (targetKcal <= 0) {
    console.log("[streakService] targetKcal <= 0 abort");
    return;
  }
  const ratio = todaysKcal / targetKcal;
  const reached = ratio >= thresholdPct;
  console.log("[streakService] ratio", { ratio, reached });
  if (!reached) return;

  const today = fmt(now);
  const ref = doc(db, "users", uid, "streak", "main");
  console.log("[streakService] update path", ref.path);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, { current: 1, lastDate: today });
      console.log("[streakService] noDoc -> set 1");
      return;
    }
    const data = sanitize(snap.data());
    if (!data) {
      tx.set(ref, { current: 1, lastDate: today }, { merge: true });
      console.log("[streakService] normalize -> set 1");
      return;
    }
    if (isSameDay(data.lastDate, today)) {
      console.log("[streakService] same day -> noop");
      return;
    }
    if (missedSince(data.lastDate, today)) {
      tx.update(ref, { current: 1, lastDate: today });
      console.log("[streakService] missed -> set 1");
    } else {
      const next = (data.current || 0) + 1;
      tx.update(ref, { current: next, lastDate: today });
      console.log("[streakService] increment", {
        from: data.current,
        to: next,
      });
    }
  });
  console.log("[streakService] updateStreakIfThresholdMet done");
}

export async function getStreak(uid: string) {
  const ref = doc(db, "users", uid, "streak", "main");
  console.log("[streakService] getStreak", { uid, path: ref.path });
  const snap = await getDoc(ref);
  if (!snap.exists) {
    console.log("[streakService] getStreak noDoc -> INIT");
    return INIT;
  }
  const d = sanitize(snap.data()) || INIT;
  console.log("[streakService] getStreak data", d);
  return d;
}

export function subscribeStreak(
  uid: string,
  cb: (data: { current: number; lastDate: string | null }) => void
) {
  const ref = doc(db, "users", uid, "streak", "main");
  console.log("[streakService] subscribeStreak", { uid, path: ref.path });
  return onSnapshot(
    ref,
    (snap) => {
      const d = sanitize(snap.data()) || INIT;
      console.log("[streakService] subscribeStreak snapshot", d);
      cb(d);
    },
    (e) => {
      console.log("[streakService] subscribeStreak error", e);
    }
  );
}

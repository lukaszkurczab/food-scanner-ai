import { doc, getDoc, setDoc } from "@react-native-firebase/firestore";
import { usersCollection, todayLocal } from "./common";

export type AiFeature = "generic" | "camera" | "text";

type AiUsageState = {
  date: string;
  counts: Record<AiFeature, number>;
};

async function readAiUsage(uid: string): Promise<AiUsageState> {
  const ref = doc(usersCollection(), uid);
  const snap = await getDoc(ref);
  const data = (snap.exists() ? snap.data() : {}) as {
    aiDailyUsage?: {
      date?: string;
      count?: number;
      counts?: Partial<Record<AiFeature, number>>;
    };
  };
  const today = todayLocal();

  const usage = data.aiDailyUsage || null;

  if (!usage || usage.date !== today) {
    return { date: today, counts: { generic: 0, camera: 0, text: 0 } };
  }

  if (typeof usage.count === "number") {
    return {
      date: usage.date,
      counts: { generic: Number(usage.count || 0), camera: 0, text: 0 },
    };
  }

  const counts = usage.counts || {};
  return {
    date: usage.date as string,
    counts: {
      generic: Number(counts.generic || 0),
      camera: Number(counts.camera || 0),
      text: Number(counts.text || 0),
    },
  };
}

async function writeAiUsage(
  uid: string,
  date: string,
  counts: Record<AiFeature, number>,
) {
  const ref = doc(usersCollection(), uid);
  await setDoc(
    ref,
    {
      aiDailyUsage: {
        date,
        counts,
      },
    },
    { merge: true },
  );
}

export async function canUseAiToday(
  uid: string,
  isPremium: boolean,
  limit = 1,
) {
  if (isPremium) return true;
  const { counts } = await readAiUsage(uid);
  return counts.generic < limit;
}

export async function consumeAiUse(uid: string, isPremium: boolean, limit = 1) {
  if (isPremium) return;
  const { date, counts } = await readAiUsage(uid);
  const next = Math.min(counts.generic + 1, limit);
  counts.generic = next;
  await writeAiUsage(uid, date, counts);
}

export async function canUseAiTodayFor(
  uid: string,
  isPremium: boolean,
  feature: AiFeature,
  limit = 1,
) {
  if (isPremium) return true;
  const { counts } = await readAiUsage(uid);
  return (counts[feature] ?? 0) < limit;
}

export async function consumeAiUseFor(
  uid: string,
  isPremium: boolean,
  feature: AiFeature,
  limit = 1,
) {
  if (isPremium) return;
  const { date, counts } = await readAiUsage(uid);
  const prev = counts[feature] ?? 0;
  const next = Math.min(prev + 1, limit);
  counts[feature] = next;
  await writeAiUsage(uid, date, counts);
}

export async function getAiUsageState(uid: string) {
  const { date, counts } = await readAiUsage(uid);
  return { date, count: counts.generic };
}

export async function getAiUsageStateFor(uid: string, feature: AiFeature) {
  const { date, counts } = await readAiUsage(uid);
  return { date, count: counts[feature] ?? 0 };
}


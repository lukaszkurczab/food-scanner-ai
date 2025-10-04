import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  where,
} from "@react-native-firebase/firestore";
import type { Badge, BadgeId } from "@/types/badge";
import { baseColors } from "@/theme/colors";
import { subscribeStreak } from "@/services/streakService";

const db = () => getFirestore(getApp());
const col = (uid: string) => collection(db(), "users", uid, "badges");

export const STREAK_MILESTONES = [7, 30, 90, 180, 365, 500, 1000] as const;

function streakBadgeSpec(days: number): Omit<Badge, "unlockedAt"> {
  const map: Record<number, { id: BadgeId; color: string }> = {
    7: { id: "streak_7", color: baseColors.green },
    30: { id: "streak_30", color: baseColors.blue },
    90: { id: "streak_90", color: "#C9A227" },
    180: { id: "streak_180", color: "#9C27B0" },
    365: { id: "streak_365", color: "#B0BEC5" },
    500: { id: "streak_500", color: "#90CAF9" },
    1000: { id: "streak_1000", color: "#80DEEA" },
  };
  const spec = map[days];
  return {
    id: spec.id,
    type: "streak",
    label: `${days} days streak`,
    milestone: days,
    icon: "🔥",
    color: spec.color,
  };
}

function premiumBadgeSpec(daysSinceStart: number): Omit<Badge, "unlockedAt"> {
  if (daysSinceStart >= 730)
    return {
      id: "premium_730d",
      type: "premium",
      label: "Premium 24m",
      milestone: 730,
      icon: "💎",
      color: "#c2e6f9ff",
    };
  if (daysSinceStart >= 365)
    return {
      id: "premium_365d",
      type: "premium",
      label: "Premium 12m",
      milestone: 365,
      icon: "👑",
      color: "#C9A227",
    };
  if (daysSinceStart >= 90)
    return {
      id: "premium_90d",
      type: "premium",
      label: "Premium 3m",
      milestone: 90,
      icon: "⭐",
      color: baseColors.orange,
    };
  return {
    id: "premium_start",
    type: "premium",
    label: "Premium started",
    milestone: "start",
    icon: "⭐",
    color: baseColors.orangeSecondary,
  };
}

async function hasBadge(uid: string, id: BadgeId) {
  const d = await getDoc(doc(col(uid), id));
  return d.exists;
}

async function giveBadge(uid: string, badge: Omit<Badge, "unlockedAt">) {
  const payload: Badge = { ...badge, unlockedAt: Date.now() };
  await setDoc(doc(col(uid), badge.id), payload, { merge: true });
  return payload;
}

export async function listBadges(uid: string): Promise<Badge[]> {
  try {
    const snap = await getDocs(col(uid));
    return snap.docs
      .map((d: any) => d.data() as Badge)
      .sort((a: any, b: any) => a.unlockedAt - b.unlockedAt);
  } catch {
    return [];
  }
}

export function subscribeBadges(uid: string, cb: (badges: Badge[]) => void) {
  const ref = col(uid);
  return onSnapshot(ref, {
    next: (snap: any) => {
      if (!snap || !Array.isArray(snap.docs)) {
        cb([]);
        return;
      }
      const items = snap.docs
        .map((d: any) => d.data() as Badge)
        .sort((a: any, b: any) => a.unlockedAt - b.unlockedAt);
      cb(items);
    },
    error: () => {
      cb([]);
    },
  });
}

export async function unlockStreakBadgesIfEligible(
  uid: string,
  currentStreak: number
) {
  for (const m of STREAK_MILESTONES) {
    if (currentStreak >= m) {
      const spec = streakBadgeSpec(m);
      if (!(await hasBadge(uid, spec.id))) {
        await giveBadge(uid, spec);
      }
    }
  }
}

export async function unlockPremiumBadgesIfEligible(
  uid: string,
  isPremium: boolean
) {
  if (!uid) return;
  if (isPremium) {
    const startId: BadgeId = "premium_start";
    if (!(await hasBadge(uid, startId))) {
      await giveBadge(uid, premiumBadgeSpec(0));
      return;
    }
    const startDoc = await getDoc(doc(col(uid), startId));
    const startAt =
      (startDoc.data() as Badge | undefined)?.unlockedAt ?? Date.now();
    const days = Math.floor((Date.now() - startAt) / 86400000);
    const targets: { id: BadgeId; days: number }[] = [
      { id: "premium_90d", days: 90 },
      { id: "premium_365d", days: 365 },
      { id: "premium_730d", days: 730 },
    ];
    for (const t of targets) {
      if (days >= t.days && !(await hasBadge(uid, t.id))) {
        await giveBadge(uid, premiumBadgeSpec(t.days));
      }
    }
  }
}

export function autoWireStreakBadges(uid: string) {
  return subscribeStreak(uid, ({ current }) => {
    unlockStreakBadgesIfEligible(uid, current).catch(() => {});
  });
}

export async function hasAnyPremiumBadge(uid: string) {
  try {
    const q = query(col(uid), where("type", "==", "premium"));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return false;
  }
}

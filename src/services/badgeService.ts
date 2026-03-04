import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Badge } from "@/types/badge";
import { get, post } from "@/services/apiClient";
import { emit, on } from "@/services/events";

type BadgeListResponse = {
  items?: unknown[];
};

function badgeCacheKey(uid: string) {
  return `badge:list:${uid}`;
}

function sortByUnlockedAtAsc(a: Badge, b: Badge): number {
  return a.unlockedAt - b.unlockedAt;
}

function normalizeBadge(raw: unknown): Badge | null {
  if (!raw || typeof raw !== "object") return null;
  const badge = raw as Partial<Badge>;

  if (
    typeof badge.id !== "string" ||
    typeof badge.type !== "string" ||
    typeof badge.label !== "string" ||
    (typeof badge.milestone !== "number" && typeof badge.milestone !== "string") ||
    typeof badge.icon !== "string" ||
    typeof badge.color !== "string" ||
    typeof badge.unlockedAt !== "number"
  ) {
    return null;
  }

  return {
    id: badge.id,
    type: badge.type,
    label: badge.label,
    milestone: badge.milestone,
    icon: badge.icon,
    color: badge.color,
    unlockedAt: badge.unlockedAt,
  };
}

function normalizeBadgeList(payload: unknown): Badge[] {
  const response = (payload || {}) as BadgeListResponse;
  const items = Array.isArray(response.items)
    ? response.items
        .map((item) => normalizeBadge(item))
        .filter((item): item is Badge => item !== null)
    : [];
  return items.sort(sortByUnlockedAtAsc);
}

async function readBadgeCache(uid: string): Promise<Badge[]> {
  try {
    const raw = await AsyncStorage.getItem(badgeCacheKey(uid));
    if (!raw) return [];
    return normalizeBadgeList({ items: JSON.parse(raw) });
  } catch {
    return [];
  }
}

async function writeBadgeCache(uid: string, items: Badge[]): Promise<void> {
  try {
    await AsyncStorage.setItem(badgeCacheKey(uid), JSON.stringify(items));
  } catch {
    // Ignore cache write failures for best-effort offline badge access.
  }
}

export async function listBadges(uid: string): Promise<Badge[]> {
  try {
    void uid;
    const response = await get<BadgeListResponse>("/users/me/badges");
    const items = normalizeBadgeList(response);
    await writeBadgeCache(uid, items);
    return items;
  } catch {
    return readBadgeCache(uid);
  }
}

export function subscribeBadges(uid: string, cb: (badges: Badge[]) => void) {
  let active = true;

  const publish = async () => {
    const items = await listBadges(uid);
    if (active) {
      cb(items);
    }
  };

  void publish();

  const unsubscribe = on<{ uid?: string }>("badge:changed", (payload) => {
    if (!active) return;
    if (payload?.uid && payload.uid !== uid) return;
    void publish();
  });

  return () => {
    active = false;
    unsubscribe();
  };
}

export async function unlockPremiumBadgesIfEligible(
  uid: string,
  isPremium: boolean
) {
  if (!uid) return;
  await post(
    "/users/me/badges/premium/reconcile",
    {
      isPremium,
    }
  );
  emit("badge:changed", { uid });
}

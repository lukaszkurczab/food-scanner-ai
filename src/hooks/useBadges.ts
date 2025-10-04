import { useEffect, useState, useCallback } from "react";
import type { Badge } from "@/types/badge";
import {
  listBadges,
  subscribeBadges,
  autoWireStreakBadges,
  unlockPremiumBadgesIfEligible,
} from "@/services/badgeService";

export function useBadges(uid: string | null | undefined) {
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!uid) return;
    let offStreak: (() => void) | null = null;
    const off = subscribeBadges(uid, setBadges);
    offStreak = autoWireStreakBadges(uid);
    return () => {
      off();
      offStreak?.();
    };
  }, [uid]);

  const refresh = useCallback(async () => {
    if (!uid) return;
    const all = await listBadges(uid);
    setBadges(all);
  }, [uid]);

  const ensurePremiumBadges = useCallback(
    async (isPremium: boolean | null) => {
      if (!uid || isPremium == null) return;
      await unlockPremiumBadgesIfEligible(uid, isPremium);
    },
    [uid]
  );

  return { badges, refresh, ensurePremiumBadges };
}

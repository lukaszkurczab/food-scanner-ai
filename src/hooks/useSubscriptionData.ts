import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { usePremiumStatus } from "@hooks/usePremiumStatus";
import type { Subscription } from "@/types/subscription";

function mapToSubscription(premium: boolean): Subscription {
  if (premium) return { state: "premium_active" };
  return { state: "free_active" };
}

export function useSubscriptionData(uid?: string | null) {
  const { checkPremiumStatus } = usePremiumStatus(uid);
  const [sub, setSub] = useState<Subscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const p = await checkPremiumStatus();
      if (!cancelled) setSub(mapToSubscription(p));
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [uid, checkPremiumStatus]);

  useEffect(() => {
    let mounted = true;

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        (async () => {
          const p = await checkPremiumStatus();
          if (mounted) setSub(mapToSubscription(p));
        })();
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [checkPremiumStatus]);

  return useMemo(() => sub, [sub]);
}

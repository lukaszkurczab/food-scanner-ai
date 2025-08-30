import { useEffect, useMemo, useState } from "react";
import { usePremiumStatus } from "@hooks/usePremiumStatus";
import type { Subscription } from "@/types/subscription";

function mapToSubscription(premium: boolean | null): Subscription {
  if (premium) return { state: "premium_active" };
  if (premium === false) return { state: "free_active" };
  return { state: "free_active" };
}

export function useSubscriptionData(uid?: string | null) {
  const { checkPremiumStatus, subscribeToPremiumChanges } = usePremiumStatus();
  const [sub, setSub] = useState<Subscription | null>(null);

  useEffect(() => {
    const u = uid ?? null;
    (async () => {
      const p = await checkPremiumStatus(u);
      setSub(mapToSubscription(p));
    })();
    const unsub = subscribeToPremiumChanges(u, (p) =>
      setSub(mapToSubscription(p))
    );
    return () => unsub();
  }, [uid, checkPremiumStatus, subscribeToPremiumChanges]);

  return useMemo(() => sub, [sub]);
}

import { useCallback, useMemo, useState } from "react";
import { Alert, Linking } from "react-native";
import Constants from "expo-constants";
import { getTermsUrl } from "@/utils/legalUrls";
import {
  openManageSubscriptions,
  restorePurchases,
  startOrRenewSubscription,
} from "@/services/billing/purchase";
import { resolvePurchaseErrorMessage } from "@/services/billing/purchaseErrorMessage";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function useManageSubscriptionState(params: {
  uid: string | null | undefined;
  subscriptionState?: string | null;
  isPremium: boolean | null | undefined;
  refreshPremium: () => Promise<unknown>;
  setDevPremium: (value: boolean) => void;
  t: Translate;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const extra = (Constants.expoConfig?.extra ?? {}) as {
    privacyUrl?: unknown;
  };
  const termsUrl = getTermsUrl();
  const privacyUrl =
    typeof extra.privacyUrl === "string" ? extra.privacyUrl : "";

  const refundUrl = useMemo(() => {
    const url = params.t("manageSubscription.refundLink", { defaultValue: "" });
    return typeof url === "string" ? url.trim() : "";
  }, [params]);

  const baseState = params.subscriptionState || "free_active";
  const isPremiumByState = baseState.startsWith("premium");
  const isPremiumComputed = !!(params.isPremium ?? isPremiumByState);
  const state = isPremiumComputed
    ? "premium_active"
    : baseState === "premium_expired"
      ? "premium_expired"
      : baseState === "free_expired"
        ? "free_expired"
        : "free_active";

  const showManageInStore = state === "premium_active";
  const showRenew = state === "premium_expired";
  const showStart = state === "free_active" || state === "free_expired";

  const headerStatus =
    state === "premium_active"
      ? params.t("manageSubscription.premium")
      : state === "premium_expired"
        ? `${params.t("manageSubscription.premium")} (${params.t("expired", { defaultValue: "expired" })})`
        : params.t("manageSubscription.free");

  const priceText = params.t("paywall.priceText", {
    defaultValue: "29,99 zł / month",
  });

  const alertTitle = params.t("manageSubscription.title");
  const alertBillingUnavailable = params.t(
    "manageSubscription.billingUnavailable",
    {
      defaultValue: "Billing is unavailable on this device.",
    },
  );

  const requireAuthOrAlert = useCallback((): boolean => {
    if (params.uid) return true;
    Alert.alert(
      alertTitle,
      params.t("manageSubscription.signInRequired", {
        defaultValue: "Please sign in to manage subscriptions.",
      }),
    );
    return false;
  }, [alertTitle, params]);

  const tryOpenManage = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await openManageSubscriptions();
      if (!ok) {
        Alert.alert(alertTitle, alertBillingUnavailable);
      }
    } finally {
      setBusy(false);
    }
  }, [alertBillingUnavailable, alertTitle]);

  const tryRestore = useCallback(async () => {
    if (!requireAuthOrAlert()) return;
    if (!params.uid) return;

    setBusy(true);
    try {
      const res = await restorePurchases(params.uid);
      if (res.status === "success") {
        await params.refreshPremium();
        Alert.alert(
          alertTitle,
          params.t("manageSubscription.restoreSuccess", {
            defaultValue: "Purchases restored.",
          }),
        );
      } else if (res.status === "cancelled") {
        return;
      } else {
        const fallback = params.t("manageSubscription.restoreFailed", {
          defaultValue: "Restore failed. Try again later.",
        });
        Alert.alert(
          alertTitle,
          resolvePurchaseErrorMessage(params.t, res.errorCode, fallback),
        );
      }
    } finally {
      setBusy(false);
    }
  }, [
    alertTitle,
    params,
    requireAuthOrAlert,
  ]);

  const trySubscribe = useCallback(async () => {
    if (!requireAuthOrAlert()) return;
    if (!params.uid) return;

    setBusy(true);
    try {
      const res = await startOrRenewSubscription(params.uid);
      if (res.status === "success") {
        await params.refreshPremium();
        setPaywallVisible(false);
        Alert.alert(
          alertTitle,
          params.t("manageSubscription.purchaseSuccess", {
            defaultValue: "Subscription active.",
          }),
        );
      } else if (res.status === "cancelled") {
        return;
      } else {
        const fallback = params.t("manageSubscription.purchaseFailed", {
          defaultValue: "Purchase failed.",
        });
        Alert.alert(
          alertTitle,
          resolvePurchaseErrorMessage(params.t, res.errorCode, fallback),
        );
      }
    } finally {
      setBusy(false);
    }
  }, [
    alertTitle,
    params,
    requireAuthOrAlert,
  ]);

  const tryOpenRefundPolicy = useCallback(async () => {
    const url = refundUrl;
    if (!url || !(url.startsWith("http://") || url.startsWith("https://"))) {
      Alert.alert(
        alertTitle,
        params.t("manageSubscription.refundLinkUnavailable", {
          defaultValue: "Refund policy link is unavailable.",
        }),
      );
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        alertTitle,
        params.t("manageSubscription.refundLinkUnavailable", {
          defaultValue: "Refund policy link is unavailable.",
        }),
      );
    }
  }, [alertTitle, params, refundUrl]);

  const openPaywall = useCallback(() => {
    setPaywallVisible(true);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallVisible(false);
  }, []);

  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  }, []);

  const toggleDevPremium = useCallback(() => {
    params.setDevPremium(!isPremiumComputed);
  }, [isPremiumComputed, params]);

  const openTerms = useCallback(async () => {
    if (!termsUrl) return;
    await Linking.openURL(termsUrl);
  }, [termsUrl]);

  const openPrivacy = useCallback(async () => {
    if (!privacyUrl) return;
    await Linking.openURL(privacyUrl);
  }, [privacyUrl]);

  return {
    expanded,
    busy,
    paywallVisible,
    termsUrl,
    privacyUrl,
    refundUrl,
    priceText,
    state,
    showRenew,
    showStart,
    showManageInStore,
    headerStatus,
    isPremiumComputed,
    toggleExpanded,
    tryOpenManage,
    tryRestore,
    trySubscribe,
    tryOpenRefundPolicy,
    openPaywall,
    closePaywall,
    toggleDevPremium,
    openTerms,
    openPrivacy,
  };
}

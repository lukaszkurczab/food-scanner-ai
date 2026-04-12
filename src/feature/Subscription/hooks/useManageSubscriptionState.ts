import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";
import Constants from "expo-constants";
import { getTermsUrl } from "@/utils/legalUrls";
import {
  openManageSubscriptions,
  restorePurchases,
  startOrRenewSubscription,
} from "@/services/billing/purchase";
import { resolvePurchaseErrorMessage } from "@/services/billing/purchaseErrorMessage";
import {
  initRevenueCat,
  isBillingDisabled,
  isRevenueCatConfigured,
} from "@/services/billing/revenuecat";
import { isPremiumSubscriptionState } from "@/services/billing/subscriptionStateMachine";
import type { SubscriptionState } from "@/types/subscription";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export type SubscriptionBusyAction =
  | "restore"
  | "purchase"
  | "manage"
  | "dev"
  | null;

export type SubscriptionActionFeedback = {
  tone: "success" | "warning" | "error";
  title: string;
  message: string;
  source: Exclude<SubscriptionBusyAction, null>;
} | null;

const PREMIUM_ACCESS_STATES = new Set<SubscriptionState>([
  "premium_active",
  "premium_trial",
  "premium_grace",
  "premium_pending_downgrade",
]);

const PREMIUM_RECOVERY_STATES = new Set<SubscriptionState>([
  "premium_expired",
  "premium_paused",
  "premium_refunded",
]);

function normalizeSubscriptionState(input: {
  rawState: string;
  isPremiumHint: boolean;
}): SubscriptionState {
  const knownStates: SubscriptionState[] = [
    "premium_active",
    "premium_trial",
    "premium_grace",
    "premium_pending_downgrade",
    "premium_paused",
    "premium_refunded",
    "premium_expired",
    "free_active",
    "free_expired",
  ];
  const raw = input.rawState as SubscriptionState;
  if (knownStates.includes(raw)) {
    return raw;
  }
  if (input.isPremiumHint) {
    return "premium_active";
  }
  return input.rawState.startsWith("premium_") ? "premium_expired" : "free_active";
}

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
  const [busyAction, setBusyAction] = useState<SubscriptionBusyAction>(null);
  const [actionFeedback, setActionFeedback] =
    useState<SubscriptionActionFeedback>(null);
  const [billingAvailability, setBillingAvailability] = useState<
    "ready" | "disabled" | "not_ready"
  >("not_ready");

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

  const baseState = (params.subscriptionState || "free_active").trim();
  const isPremiumByState = isPremiumSubscriptionState(baseState);
  const isPremiumComputed = Boolean(params.isPremium ?? isPremiumByState);
  const state = normalizeSubscriptionState({
    rawState: baseState,
    isPremiumHint: isPremiumComputed,
  });

  const showManageInStore = PREMIUM_ACCESS_STATES.has(state);
  const showRenew = PREMIUM_RECOVERY_STATES.has(state);
  const showStart = !showManageInStore && !showRenew;

  const headerStatus =
    state === "premium_trial"
      ? params.t("manageSubscription.premiumTrial", {
          defaultValue: "Premium (trial)",
        })
      : state === "premium_grace"
        ? params.t("manageSubscription.premiumGrace", {
            defaultValue: "Premium (grace period)",
          })
        : state === "premium_pending_downgrade"
          ? params.t("manageSubscription.premiumPendingDowngrade", {
              defaultValue: "Premium (ending soon)",
            })
          : state === "premium_paused"
            ? params.t("manageSubscription.premiumPaused", {
                defaultValue: "Premium (paused)",
              })
            : state === "premium_refunded"
              ? params.t("manageSubscription.premiumRefunded", {
                  defaultValue: "Premium (refunded)",
                })
              : state === "premium_expired"
                ? `${params.t("manageSubscription.premium")} (${params.t("expired", { defaultValue: "expired" })})`
                : state === "premium_active"
                  ? params.t("manageSubscription.premium")
                  : params.t("manageSubscription.free");

  const priceText = params.t("paywall.priceText", {
    defaultValue: "29,99 zł / month",
  });

  const alertBillingUnavailable = params.t(
    "manageSubscription.billingUnavailable",
    {
      defaultValue: "Billing is unavailable on this device.",
    },
  );

  useEffect(() => {
    initRevenueCat();
    setBillingAvailability(
      isBillingDisabled()
        ? "disabled"
        : isRevenueCatConfigured()
          ? "ready"
          : "not_ready",
    );
  }, []);

  const setFeedbackForError = useCallback(
    (
      source: Exclude<SubscriptionBusyAction, null>,
      message: string,
      title?: string,
    ) => {
      setActionFeedback({
        tone: "error",
        title:
          title ??
          params.t("manageSubscription.issueTitle", {
            defaultValue: "Subscription issue",
          }),
        message,
        source,
      });
    },
    [params],
  );

  const requireAuthOrAlert = useCallback(
    (source: Exclude<SubscriptionBusyAction, null>): boolean => {
      if (params.uid) return true;
      setFeedbackForError(
        source,
        params.t("manageSubscription.signInRequired", {
          defaultValue: "Please sign in to manage subscriptions.",
        }),
      );
      return false;
    },
    [params, setFeedbackForError],
  );

  const tryOpenManage = useCallback(async () => {
    setBusy(true);
    setBusyAction("manage");
    try {
      const ok = await openManageSubscriptions();
      if (!ok) {
        setFeedbackForError("manage", alertBillingUnavailable);
      }
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }, [alertBillingUnavailable, setFeedbackForError]);

  const tryRestore = useCallback(async () => {
    if (!requireAuthOrAlert("restore")) return;
    if (!params.uid) return;

    setBusy(true);
    setBusyAction("restore");
    try {
      const res = await restorePurchases(params.uid);
      if (res.status === "success") {
        await params.refreshPremium();
        setActionFeedback({
          tone: "success",
          title: params.t("manageSubscription.restoreSuccessTitle", {
            defaultValue: "Restore complete",
          }),
          message: params.t("manageSubscription.restoreSuccess", {
            defaultValue: "Purchases restored.",
          }),
          source: "restore",
        });
      } else if (res.status === "cancelled") {
        return;
      } else {
        const fallback = params.t("manageSubscription.restoreFailed", {
          defaultValue: "Restore failed. Try again later.",
        });
        setFeedbackForError(
          "restore",
          resolvePurchaseErrorMessage(params.t, res.errorCode, fallback),
          params.t("manageSubscription.restoreFailedTitle", {
            defaultValue: "Restore failed",
          }),
        );
      }
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }, [
    params,
    requireAuthOrAlert,
    setFeedbackForError,
  ]);

  const trySubscribe = useCallback(async () => {
    if (!requireAuthOrAlert("purchase")) return;
    if (!params.uid) return;

    setBusy(true);
    setBusyAction("purchase");
    try {
      const res = await startOrRenewSubscription(params.uid);
      if (res.status === "success") {
        await params.refreshPremium();
        setPaywallVisible(false);
        setActionFeedback({
          tone: "success",
          title: params.t("manageSubscription.purchaseSuccessTitle", {
            defaultValue: "Premium active",
          }),
          message: params.t("manageSubscription.purchaseSuccess", {
            defaultValue: "Subscription active.",
          }),
          source: "purchase",
        });
      } else if (res.status === "cancelled") {
        return;
      } else {
        const fallback = params.t("manageSubscription.purchaseFailed", {
          defaultValue: "Purchase failed.",
        });
        setFeedbackForError(
          "purchase",
          resolvePurchaseErrorMessage(params.t, res.errorCode, fallback),
          params.t("manageSubscription.purchaseFailedTitle", {
            defaultValue: "Subscription unavailable",
          }),
        );
      }
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }, [
    params,
    requireAuthOrAlert,
    setFeedbackForError,
  ]);

  const tryOpenRefundPolicy = useCallback(async () => {
    const url = refundUrl;
    if (!url || !(url.startsWith("http://") || url.startsWith("https://"))) {
      setFeedbackForError(
        "manage",
        params.t("manageSubscription.refundLinkUnavailable", {
          defaultValue: "Refund policy link is unavailable.",
        }),
      );
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      setFeedbackForError(
        "manage",
        params.t("manageSubscription.refundLinkUnavailable", {
          defaultValue: "Refund policy link is unavailable.",
        }),
      );
    }
  }, [params, refundUrl, setFeedbackForError]);

  const openPaywall = useCallback(() => {
    setActionFeedback(null);
    setPaywallVisible(true);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallVisible(false);
  }, []);

  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  }, []);

  const toggleDevPremium = useCallback(() => {
    setBusyAction("dev");
    params.setDevPremium(!isPremiumComputed);
    setBusyAction(null);
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
    billingAvailability,
    busyAction,
    actionFeedback,
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
    clearActionFeedback: () => setActionFeedback(null),
  };
}

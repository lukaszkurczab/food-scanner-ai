import type { PurchaseErrorCode } from "@/services/billing/purchase";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function tCommon(t: Translate, key: string, defaultValue: string): string {
  return t(`billingErrors.${key}`, { ns: "common", defaultValue });
}

export function resolvePurchaseErrorMessage(
  t: Translate,
  code: PurchaseErrorCode | undefined,
  fallbackMessage: string,
): string {
  switch (code) {
    case "billing_unavailable":
      return tCommon(
        t,
        "billingUnavailable",
        "Billing is unavailable on this device.",
      );
    case "billing_not_initialized":
      return tCommon(
        t,
        "billingNotReady",
        "Billing is not ready yet. Please try again in a moment.",
      );
    case "sign_in_required":
      return tCommon(
        t,
        "signInRequired",
        "Please sign in to manage subscriptions.",
      );
    case "login_failed":
      return tCommon(
        t,
        "loginFailed",
        "Unable to connect your account to billing. Please try again.",
      );
    case "no_offerings":
      return tCommon(
        t,
        "productsUnavailable",
        "Subscription options are temporarily unavailable. Please try again later.",
      );
    case "entitlement_inactive":
      return tCommon(
        t,
        "entitlementPending",
        "Purchase completed, but activation is still pending. Please restore purchases in a moment.",
      );
    case "network":
      return tCommon(
        t,
        "network",
        "Network problem while contacting the App Store. Please try again.",
      );
    case "purchase_not_allowed":
      return tCommon(
        t,
        "purchaseNotAllowed",
        "Purchases are not allowed on this device.",
      );
    case "store_problem":
      return tCommon(
        t,
        "storeProblem",
        "The App Store is temporarily unavailable. Please try again later.",
      );
    default:
      return fallbackMessage;
  }
}

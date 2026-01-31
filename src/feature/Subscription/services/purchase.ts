import { Platform, Linking } from "react-native";
import Purchases from "react-native-purchases";
import {
  initRevenueCat,
  isBillingDisabled,
  isRevenueCatConfigured,
  rcLogIn,
} from "./revenuecat";

type PurchaseResult =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "unavailable"; message?: string }
  | { status: "error"; message?: string };

function log(...args: any[]) {
  console.log("[IAP]", ...args);
}

function errToObj(e: any) {
  return {
    message: e?.message,
    code: e?.code,
    userCancelled: e?.userCancelled,
    readableErrorCode: e?.readableErrorCode,
  };
}

export async function startOrRenewSubscription(
  uid?: string | null,
): Promise<PurchaseResult> {
  initRevenueCat();

  if (!isRevenueCatConfigured()) {
    return {
      status: "error",
      message: "Billing not initialized (RevenueCat not configured).",
    };
  }

  if (isBillingDisabled()) return { status: "unavailable" };

  if (!uid) {
    return {
      status: "error",
      message: "You must be signed in to start a subscription.",
    };
  }

  const loggedIn = await rcLogIn(uid);
  if (!loggedIn) {
    return {
      status: "error",
      message: "Unable to sign in to billing. Please try again.",
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;

    log("getOfferings", {
      hasCurrent: !!current,
      packages: current?.availablePackages.map((p) => ({
        id: p.identifier,
        type: p.packageType,
        productId: p.product?.identifier,
        price: p.product?.priceString,
      })),
    });

    if (!current || current.availablePackages.length === 0) {
      return { status: "error", message: "No offerings available." };
    }

    const selected =
      current.availablePackages.find((p) => p.packageType === "MONTHLY") ??
      current.availablePackages[0];

    const { customerInfo } = await Purchases.purchasePackage(selected);
    const premium = !!customerInfo.entitlements.active["premium"];

    log("purchase result", {
      premium,
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
    });

    if (!premium) {
      return {
        status: "error",
        message: "Purchase completed but entitlement not active.",
      };
    }

    return { status: "success" };
  } catch (e: any) {
    log("purchase FAILED", errToObj(e));
    if (e?.userCancelled) return { status: "cancelled" };
    return { status: "error", message: e?.message };
  }
}

export async function restorePurchases(
  uid?: string | null,
): Promise<PurchaseResult> {
  initRevenueCat();

  if (!isRevenueCatConfigured()) {
    return {
      status: "error",
      message: "Billing not initialized (RevenueCat not configured).",
    };
  }

  if (isBillingDisabled()) return { status: "unavailable" };

  if (!uid) {
    return {
      status: "error",
      message: "You must be signed in to restore purchases.",
    };
  }

  const loggedIn = await rcLogIn(uid);
  if (!loggedIn) {
    return {
      status: "error",
      message: "Unable to sign in to billing. Please try again.",
    };
  }

  try {
    const info = await Purchases.restorePurchases();
    const premium = !!info.entitlements.active["premium"];

    if (premium) return { status: "success" };

    return {
      status: "error",
      message: "No active premium entitlement after restore.",
    };
  } catch (e: any) {
    if (e?.userCancelled) return { status: "cancelled" };
    return { status: "error", message: e?.message };
  }
}

export async function openManageSubscriptions(): Promise<boolean> {
  try {
    if (Platform.OS === "ios") {
      await Linking.openURL("https://apps.apple.com/account/subscriptions");
      return true;
    }
    await Linking.openURL(
      "https://play.google.com/store/account/subscriptions",
    );
    return true;
  } catch {
    return false;
  }
}

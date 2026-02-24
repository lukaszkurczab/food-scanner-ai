import { Platform, Linking } from "react-native";
import Purchases from "react-native-purchases";
import {
  initRevenueCat,
  isBillingDisabled,
  isRevenueCatConfigured,
  rcLogIn,
} from "@/services/billing/revenuecat";

type PurchaseResult =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "unavailable"; message?: string }
  | { status: "error"; message?: string };

type PurchaseErrorMeta = {
  message?: string;
  code?: string;
  userCancelled?: boolean;
  readableErrorCode?: string;
};

function log(...args: unknown[]) {
  console.log("[IAP]", ...args);
}

function errToObj(e: unknown): PurchaseErrorMeta {
  if (!e || typeof e !== "object") return {};
  const obj = e as {
    message?: unknown;
    code?: unknown;
    userCancelled?: unknown;
    readableErrorCode?: unknown;
  };
  return {
    message: typeof obj.message === "string" ? obj.message : undefined,
    code: typeof obj.code === "string" ? obj.code : undefined,
    userCancelled: typeof obj.userCancelled === "boolean" ? obj.userCancelled : undefined,
    readableErrorCode:
      typeof obj.readableErrorCode === "string" ? obj.readableErrorCode : undefined,
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
  } catch (e: unknown) {
    const meta = errToObj(e);
    log("purchase FAILED", meta);
    if (meta.userCancelled) return { status: "cancelled" };
    return { status: "error", message: meta.message };
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
  } catch (e: unknown) {
    const meta = errToObj(e);
    if (meta.userCancelled) return { status: "cancelled" };
    return { status: "error", message: meta.message };
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

import { Platform, Linking } from "react-native";
import Purchases from "react-native-purchases";
import Constants from "expo-constants";
import * as Device from "expo-device";

type PurchaseResult =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "unavailable"; message?: string }
  | { status: "error"; message?: string };

function billingDisabled(): boolean {
  const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;
  if (__DEV__) return !!extra.disableBilling || !Device.isDevice;
  return false;
}

export async function openManageSubscriptions(): Promise<boolean> {
  try {
    if (billingDisabled()) return false;

    const androidPkg = (Constants.expoConfig?.android as any)?.package as
      | string
      | undefined;

    if (Platform.OS === "android" && androidPkg) {
      const url = `https://play.google.com/store/account/subscriptions?package=${androidPkg}`;
      await Linking.openURL(url);
      return true;
    }

    if (Platform.OS === "ios") {
      const url = "itms-apps://apps.apple.com/account/subscriptions";
      await Linking.openURL(url);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  if (billingDisabled()) return { status: "unavailable" };
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

export async function startOrRenewSubscription(): Promise<PurchaseResult> {
  if (billingDisabled()) return { status: "unavailable" };

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    const packages = current?.availablePackages ?? [];

    if (!current || packages.length === 0) {
      return {
        status: "error",
        message: "No current offering / packages available.",
      };
    }

    const findById = (id: string) => packages.find((p) => p.identifier === id);

    const monthly =
      findById("$rc_monthly") ||
      packages.find((p) => p.packageType === "MONTHLY");

    const annual =
      findById("$rc_annual") ||
      packages.find((p) => p.packageType === "ANNUAL");

    const selected = monthly || annual || packages[0];
    if (!selected) {
      return { status: "error", message: "No package selected." };
    }

    const { customerInfo } = await Purchases.purchasePackage(selected);
    const premium = !!customerInfo.entitlements.active["premium"];

    if (premium) return { status: "success" };

    return {
      status: "error",
      message: "Purchase completed but premium entitlement is not active.",
    };
  } catch (e: any) {
    if (e?.userCancelled) return { status: "cancelled" };
    return { status: "error", message: e?.message };
  }
}

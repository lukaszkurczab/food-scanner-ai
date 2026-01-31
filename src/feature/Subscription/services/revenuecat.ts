import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import Constants from "expo-constants";
import * as Device from "expo-device";

let configured = false;

function getExtra() {
  return (Constants.expoConfig?.extra || {}) as Record<string, any>;
}

function maskKey(k: string) {
  if (!k) return "(empty)";
  return `${k.slice(0, 4)}***${k.slice(-4)}`;
}

export function isBillingDisabled(): boolean {
  const extra = getExtra();
  if (__DEV__) return !!extra.disableBilling || !Device.isDevice;
  return false;
}

function log(...args: any[]) {
  console.log("[RC]", ...args);
}

export function initRevenueCat() {
  if (configured) {
    log("initRevenueCat: already configured");
    return;
  }

  const extra = getExtra();
  const disabled = isBillingDisabled();

  const iosKey = extra.revenuecatIosKey as string | undefined;
  const androidKey = extra.revenuecatAndroidKey as string | undefined;

  const apiKey = Platform.OS === "ios" ? iosKey : androidKey;

  log("initRevenueCat: start", {
    platform: Platform.OS,
    isDevice: Device.isDevice,
    __DEV__,
    billingDisabled: disabled,
    iosKeyLen: iosKey?.length ?? 0,
    androidKeyLen: androidKey?.length ?? 0,
    selectedKeyMasked: maskKey(apiKey || ""),
  });

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);

  if (!apiKey) {
    log("❌ RevenueCat API key MISSING – check app.config extra + EAS env");
    configured = false;
    return;
  }

  if (disabled) {
    log("RevenueCat disabled by config");
    configured = false;
    return;
  }

  try {
    Purchases.configure({
      apiKey,
      appUserID: null,
    });

    configured = true;
    log("✅ Purchases.configure OK");
  } catch (e: any) {
    configured = false;
    log("❌ Purchases.configure FAILED", {
      message: e?.message,
      code: e?.code,
      userInfo: e?.userInfo,
    });
  }
}

export function isRevenueCatConfigured() {
  return configured;
}

export async function rcLogIn(uid: string): Promise<boolean> {
  initRevenueCat();
  if (!isRevenueCatConfigured()) return false;

  try {
    await Purchases.logIn(uid);
    log("rcLogIn OK", { uid });
    return true;
  } catch (e: any) {
    log("rcLogIn FAILED", { message: e?.message, code: e?.code });
    return false;
  }
}

export async function rcLogOut(): Promise<void> {
  initRevenueCat();
  if (!isRevenueCatConfigured()) return;

  try {
    await Purchases.logOut();
    log("rcLogOut OK");
  } catch (e: any) {
    log("rcLogOut FAILED", { message: e?.message, code: e?.code });
  }
}

export async function rcSetAttributes(
  attrs: Record<string, string | null>,
): Promise<void> {
  initRevenueCat();
  if (!isRevenueCatConfigured()) return;

  try {
    const filtered: Record<string, string> = {};
    Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (typeof v === "string" && v.length > 0) filtered[k] = v;
    });

    await Purchases.setAttributes(filtered);
    log("rcSetAttributes OK", { keys: Object.keys(filtered) });
  } catch (e: any) {
    log("rcSetAttributes FAILED", { message: e?.message, code: e?.code });
  }
}

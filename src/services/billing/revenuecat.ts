import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import Constants from "expo-constants";
import * as Device from "expo-device";

let configured = false;

type RevenueCatExtra = {
  disableBilling?: boolean;
  revenuecatIosKey?: string;
  revenuecatAndroidKey?: string;
};

function getExtra() {
  const raw = Constants.expoConfig?.extra;
  if (!raw || typeof raw !== "object") return {} as RevenueCatExtra;
  const extra = raw as Record<string, unknown>;
  return {
    disableBilling:
      typeof extra.disableBilling === "boolean" ? extra.disableBilling : undefined,
    revenuecatIosKey:
      typeof extra.revenuecatIosKey === "string"
        ? extra.revenuecatIosKey
        : undefined,
    revenuecatAndroidKey:
      typeof extra.revenuecatAndroidKey === "string"
        ? extra.revenuecatAndroidKey
        : undefined,
  } as RevenueCatExtra;
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

function log(...args: unknown[]) {
  console.log("[RC]", ...args);
}

function getErrorMeta(err: unknown) {
  if (!err || typeof err !== "object") return { message: undefined, code: undefined };
  const obj = err as { message?: unknown; code?: unknown; userInfo?: unknown };
  return {
    message: typeof obj.message === "string" ? obj.message : undefined,
    code: typeof obj.code === "string" ? obj.code : undefined,
    userInfo: obj.userInfo,
  };
}

export function initRevenueCat() {
  if (configured) {
    log("initRevenueCat: already configured");
    return;
  }

  const extra = getExtra();
  const disabled = isBillingDisabled();

  const iosKey = extra.revenuecatIosKey;
  const androidKey = extra.revenuecatAndroidKey;

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
  } catch (e: unknown) {
    const meta = getErrorMeta(e);
    configured = false;
    log("❌ Purchases.configure FAILED", {
      message: meta.message,
      code: meta.code,
      userInfo: meta.userInfo,
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
  } catch (e: unknown) {
    const meta = getErrorMeta(e);
    log("rcLogIn FAILED", { message: meta.message, code: meta.code });
    return false;
  }
}

export async function rcLogOut(): Promise<void> {
  initRevenueCat();
  if (!isRevenueCatConfigured()) return;

  try {
    await Purchases.logOut();
    log("rcLogOut OK");
  } catch (e: unknown) {
    const meta = getErrorMeta(e);
    log("rcLogOut FAILED", { message: meta.message, code: meta.code });
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
  } catch (e: unknown) {
    const meta = getErrorMeta(e);
    log("rcSetAttributes FAILED", { message: meta.message, code: meta.code });
  }
}

import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import Constants from "expo-constants";
import * as Device from "expo-device";

let configured = false;

function getExtra() {
  return (Constants.expoConfig?.extra || {}) as Record<string, any>;
}

function isBillingDisabled() {
  const extra = getExtra();
  return !!extra.disableBilling || !Device.isDevice;
}

export function initRevenueCat() {
  if (configured) return;
  const extra = getExtra();
  if (isBillingDisabled()) {
    configured = true;
    return;
  }
  try {
    Purchases.setLogLevel?.(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  } catch {}
  const androidKey = (extra.revenuecatAndroidKey as string) || "";
  const iosKey = (extra.revenuecatIosKey as string) || "";
  const apiKey = Platform.OS === "android" ? androidKey : iosKey;
  if (!apiKey) {
    configured = true;
    return;
  }
  Purchases.configure({ apiKey, appUserID: null });
  configured = true;
}

export async function rcLogIn(
  uid: string | null | undefined
): Promise<boolean> {
  if (isBillingDisabled()) return false;
  if (!uid) return false;
  try {
    const { customerInfo } = await Purchases.logIn(uid);
    return !!customerInfo;
  } catch {
    return false;
  }
}

export async function rcLogOut(): Promise<void> {
  if (isBillingDisabled()) return;
  try {
    await Purchases.logOut();
  } catch {}
}

export async function rcSetAttributes(attrs: {
  email?: string | null;
  locale?: string | null;
}): Promise<void> {
  if (isBillingDisabled()) return;
  try {
    const out: Record<string, string | null> = {};
    if ("email" in attrs) out.email = attrs.email ?? null;
    if ("locale" in attrs) out.locale = attrs.locale ?? null;
    await Purchases.setAttributes(out);
  } catch {}
}

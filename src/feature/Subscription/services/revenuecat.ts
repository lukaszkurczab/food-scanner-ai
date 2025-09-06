import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import Constants from "expo-constants";
import * as Device from "expo-device";

let configured = false;

export function initRevenueCat() {
  if (configured) return;
  const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;
  const disableBilling = !!extra.disableBilling || !Device.isDevice;
  if (disableBilling) {
    // Skip configuring RevenueCat on simulators or when disabled via env
    configured = true;
    return;
  }

  // Reduce noisy logs in dev where billing might not be set up completely
  try {
    // @ts-ignore - enum provided by SDK
    Purchases.setLogLevel?.(Purchases.LOG_LEVEL?.ERROR ?? 2);
  } catch {}

  const androidKey = (extra.revenuecatAndroidKey as string) || "";
  const iosKey = (extra.revenuecatIosKey as string) || "";
  const apiKey = Platform.OS === "android" ? androidKey : iosKey;
  if (!apiKey) {
    // No key for this platform; don't initialize
    configured = true;
    return;
  }

  Purchases.configure({ apiKey, appUserID: null });
  configured = true;
}

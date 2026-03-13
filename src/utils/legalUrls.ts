import { Platform } from "react-native";
import Constants from "expo-constants";

const APPLE_EULA_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

export function getTermsUrl(): string {
  if (Platform.OS === "ios") {
    return APPLE_EULA_URL;
  }
  const extra = Constants.expoConfig?.extra as
    | { termsUrl?: string }
    | undefined;
  return typeof extra?.termsUrl === "string" ? extra.termsUrl : "";
}

import Constants from "expo-constants";

export function getTermsUrl(): string {
  const extra = Constants.expoConfig?.extra as
    | { termsUrl?: string }
    | undefined;
  return typeof extra?.termsUrl === "string" ? extra.termsUrl : "";
}

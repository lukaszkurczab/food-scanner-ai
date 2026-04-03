import Constants from "expo-constants";
import * as Device from "expo-device";

const DEFAULT_SUPPORT_EMAIL = "lukasz.kurczab@gmail.com";

export function getSupportEmail(): string {
  const extra = Constants.expoConfig?.extra as
    | { supportEmail?: string }
    | undefined;

  if (typeof extra?.supportEmail === "string" && extra.supportEmail.trim()) {
    return extra.supportEmail.trim();
  }

  return DEFAULT_SUPPORT_EMAIL;
}

export function buildSupportMailto(params?: {
  userEmail?: string | null;
  userUid?: string | null;
  context?: string | null;
}): string {
  const email = getSupportEmail();
  const subject = "Fitaly support";
  const lines = [
    params?.context ? `Context: ${params.context}` : null,
    params?.userEmail ? `Account email: ${params.userEmail}` : null,
    params?.userUid ? `User ID: ${params.userUid}` : null,
    Device.modelName ? `Device: ${Device.modelName}` : null,
    Device.osName || Device.osVersion
      ? `OS: ${[Device.osName, Device.osVersion].filter(Boolean).join(" ")}`
      : null,
    "",
    "Describe what happened:",
    "",
  ].filter((line): line is string => Boolean(line));

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

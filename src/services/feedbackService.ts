import { upload } from "@/services/apiClient";
import { withVersion } from "@/services/apiVersioning";

type DeviceInfo = {
  modelName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
};

export type SendFeedbackInput = {
  message: string;
  attachmentUri?: string | null;
  userUid?: string | null;
  email?: string | null;
  deviceInfo?: DeviceInfo | null;
};

export async function sendFeedback({
  message,
  attachmentUri,
  userUid = null,
  email = null,
  deviceInfo = null,
}: SendFeedbackInput): Promise<void> {
  void userUid;
  void email;
  const data = new FormData();
  data.append("message", message);
  if (deviceInfo?.modelName) {
    data.append("deviceModelName", deviceInfo.modelName);
  }
  if (deviceInfo?.osName) {
    data.append("deviceOsName", deviceInfo.osName);
  }
  if (deviceInfo?.osVersion) {
    data.append("deviceOsVersion", deviceInfo.osVersion);
  }
  if (attachmentUri) {
    const filename =
      attachmentUri.split("/").pop() || `attachment-${Date.now()}.jpg`;
    data.append("file", {
      uri: attachmentUri,
      name: filename,
      type: "image/jpeg",
    } as unknown as Blob);
  }

  await upload(withVersion("/users/me/feedback"), data);
}

import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
} from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";

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

function fs() {
  return getFirestore(getApp());
}

const FEEDBACKS_COL = "feedbacks";

export async function sendFeedback({
  message,
  attachmentUri,
  userUid = null,
  email = null,
  deviceInfo = null,
}: SendFeedbackInput): Promise<void> {
  const createdAt = Date.now();

  const ref = await addDoc(collection(fs(), FEEDBACKS_COL), {
    message,
    userUid,
    email,
    deviceInfo,
    createdAt,
    status: "new",
    attachmentUrl: null,
    attachmentPath: null,
  });

  if (attachmentUri) {
    const filename =
      attachmentUri.split("/").pop() || `attachment-${createdAt}`;
    const path = `feedbacks/${ref.id}/${filename}`;
    const fileRef = storage().ref(path);

    await fileRef.putFile(attachmentUri);
    const url = await fileRef.getDownloadURL();

    await updateDoc(doc(fs(), FEEDBACKS_COL, ref.id), {
      attachmentUrl: url,
      attachmentPath: path,
      updatedAt: Date.now(),
    });
  }
}

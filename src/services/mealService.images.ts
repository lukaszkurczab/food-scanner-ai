import { getApp } from "@react-native-firebase/app";
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import NetInfo from "@react-native-community/netinfo";
import { v4 as uuidv4 } from "uuid";

const st = getStorage(getApp());
const CLOUD_MAX = 1280;
const CLOUD_Q = 0.8;
const AI_MAX = 480;
const AI_Q = 0.75;

export type UploadedImage = {
  imageId: string;
  cloudUrl: string;
  aiLocalUri: string;
};

async function ensureDirFor(filePath: string) {
  const dir = filePath.replace(/[^/]+$/, "");
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

async function toJpegMaxSide(uri: string, maxSide: number, q: number) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxSide } }],
    { compress: q, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

export function localPhotoPath(uid: string, id: string) {
  return `${FileSystem.documentDirectory}meals/${uid}/${id}.jpg`;
}

export async function processAndUpload(
  userUid: string,
  localUri: string
): Promise<UploadedImage> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) throw new Error("net/offline");

  const cloudJpeg = await toJpegMaxSide(localUri, CLOUD_MAX, CLOUD_Q);

  const aiTmp = `${FileSystem.cacheDirectory}ai/${uuidv4()}.jpg`;
  await ensureDirFor(aiTmp);
  const aiJpeg = await toJpegMaxSide(localUri, AI_MAX, AI_Q);
  await FileSystem.copyAsync({ from: aiJpeg, to: aiTmp });

  const imageId = uuidv4();
  const storagePath = `meals/${userUid}/${imageId}.jpg`;
  const r = ref(st, storagePath);
  await putFile(r, cloudJpeg, { contentType: "image/jpeg" });
  const cloudUrl = await getDownloadURL(r);

  return { imageId, cloudUrl, aiLocalUri: aiTmp };
}

export async function getCloudImageUrl(
  uid: string,
  imageIdOrCloudId: string
): Promise<string> {
  const r = ref(st, `meals/${uid}/${imageIdOrCloudId}.jpg`);
  return getDownloadURL(r);
}

export async function ensureLocalMealPhoto(args: {
  uid: string;
  cloudId?: string | null;
  imageId?: string | null;
  photoUrl?: string | null;
}): Promise<string | null> {
  const { uid, cloudId, imageId, photoUrl } = args;
  const id = String(cloudId || imageId || "").trim();
  if (!uid || !id) return null;

  const target = localPhotoPath(uid, id);
  await ensureDirFor(target);

  const info = await FileSystem.getInfoAsync(target);
  if (info.exists) return target;

  let remoteUrl: string | null = null;

  if (photoUrl && /^https?:\/\//i.test(photoUrl)) {
    remoteUrl = photoUrl;
  } else if (imageId) {
    try {
      remoteUrl = await getCloudImageUrl(uid, imageId);
    } catch {
      remoteUrl = null;
    }
  }

  if (!remoteUrl && cloudId) {
    try {
      remoteUrl = await getCloudImageUrl(uid, cloudId);
    } catch {
      remoteUrl = null;
    }
  }

  if (!remoteUrl) return null;

  try {
    await FileSystem.downloadAsync(remoteUrl, target);
    const ok = await FileSystem.getInfoAsync(target);
    return ok.exists ? target : null;
  } catch {
    return null;
  }
}

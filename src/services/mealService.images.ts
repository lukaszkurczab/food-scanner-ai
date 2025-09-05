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

async function ensureDir(p: string) {
  const dir = p.replace(/[^/]+$/, "");
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {}
}

async function toJpegMaxSide(uri: string, maxSide: number, q: number) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxSide } }],
    { compress: q, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

export async function processAndUpload(
  userUid: string,
  localUri: string
): Promise<UploadedImage> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) throw new Error("net/offline");

  const cloudJpeg = await toJpegMaxSide(localUri, CLOUD_MAX, CLOUD_Q);

  const aiTmp = `${FileSystem.cacheDirectory}ai/${uuidv4()}.jpg`;
  await ensureDir(aiTmp);
  const aiJpeg = await toJpegMaxSide(localUri, AI_MAX, AI_Q);
  await FileSystem.copyAsync({ from: aiJpeg, to: aiTmp });

  const imageId = uuidv4();
  const storagePath = `meals/${userUid}/${imageId}.jpg`;
  const r = ref(st, storagePath);
  await putFile(r, cloudJpeg, { contentType: "image/jpeg" });
  const cloudUrl = await getDownloadURL(r);

  return { imageId, cloudUrl, aiLocalUri: aiTmp };
}

export async function resolveMealImageUrl(
  uid: string,
  meal: { imageId?: string | null; photoUrl?: string | null }
) {
  if (meal?.photoUrl && /^https?:\/\//i.test(meal.photoUrl))
    return meal.photoUrl;
  if (meal?.imageId) {
    try {
      const r = ref(st, `meals/${uid}/${meal.imageId}.jpg`);
      return await getDownloadURL(r);
    } catch {}
  }
  return null;
}

export async function recoverLocalImage(
  uid: string,
  cloudUrl: string,
  fileId: string
) {
  const target = `${FileSystem.documentDirectory}users/${uid}/images/${fileId}.jpg`;
  await ensureDir(target);
  await FileSystem.downloadAsync(cloudUrl, target);
  return target;
}

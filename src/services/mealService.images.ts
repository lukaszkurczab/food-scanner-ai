import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import NetInfo from "@react-native-community/netinfo";
import { v4 as uuidv4 } from "uuid";
import { get, upload } from "@/services/apiClient";
import { createServiceError } from "@/services/contracts/serviceError";

const CLOUD_MAX = 1280;
const CLOUD_Q = 0.8;
const AI_MAX = 480;
const AI_Q = 0.75;
const CLOUD_URL_CACHE = new Map<string, string>();

export type UploadedImage = {
  imageId: string;
  cloudUrl: string;
  aiLocalUri: string;
};

type MealPhotoResponse = {
  imageId?: string;
  photoUrl?: string;
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
  if (!net.isConnected) {
    throw createServiceError({
      code: "net/offline",
      source: "MealImageService",
      retryable: true,
    });
  }

  const cloudJpeg = await toJpegMaxSide(localUri, CLOUD_MAX, CLOUD_Q);

  const aiTmp = `${FileSystem.cacheDirectory}ai/${uuidv4()}.jpg`;
  await ensureDirFor(aiTmp);
  const aiJpeg = await toJpegMaxSide(localUri, AI_MAX, AI_Q);
  await FileSystem.copyAsync({ from: aiJpeg, to: aiTmp });

  void userUid;
  const data = new FormData();
  data.append("file", {
    uri: cloudJpeg,
    name: "meal.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const response = await upload<MealPhotoResponse>("/users/me/meals/photo", data);
  const imageId = String(response.imageId || "").trim();
  const cloudUrl = String(response.photoUrl || "").trim();

  return { imageId, cloudUrl, aiLocalUri: aiTmp };
}

async function getMealPhotoUrl(args: {
  mealId?: string | null;
  imageId?: string | null;
}): Promise<string> {
  const params = new URLSearchParams();
  if (args.mealId) {
    params.set("mealId", args.mealId);
  }
  if (args.imageId) {
    params.set("imageId", args.imageId);
  }
  const key = `meals:${args.mealId || ""}:${args.imageId || ""}`;
  const cached = CLOUD_URL_CACHE.get(key);
  if (cached) return cached;
  const response = await get<MealPhotoResponse>(
    `/users/me/meals/photo-url?${params.toString()}`,
  );
  const url = String(response.photoUrl || "").trim();
  CLOUD_URL_CACHE.set(key, url);
  return url;
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
  } else if (cloudId || imageId) {
    try {
      remoteUrl = await getMealPhotoUrl({
        mealId: cloudId,
        imageId,
      });
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

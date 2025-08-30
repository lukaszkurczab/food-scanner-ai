import { getApp } from "@react-native-firebase/app";
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import { v4 as uuidv4 } from "uuid";
import NetInfo from "@react-native-community/netinfo";

const app = getApp();
const st = getStorage(app);

export type UploadedImage = {
  imageId: string;
  url: string;
};

export async function uploadImageFromLocal(
  localUri: string
): Promise<UploadedImage> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    throw new Error("No internet connection, cannot upload image");
  }
  const imageId = uuidv4();
  const storagePath = `images/${imageId}.jpg`;
  const r = ref(st, storagePath);
  await putFile(r, localUri);
  const url = await getDownloadURL(r);
  return { imageId, url };
}

import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

const SAMPLE_MEAL = require("../../assets/sampleMeal.jpg");
const SAMPLE_TABLE = require("../../assets/sampleTable.jpg");

async function ensureFileUri(mod: number, cacheName: string): Promise<string> {
  const asset = Asset.fromModule(mod);
  if (!asset.downloaded) await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (uri?.startsWith("file://")) return uri;
  const target = `${FileSystem.cacheDirectory}${cacheName}`;
  await FileSystem.copyAsync({ from: uri!, to: target });
  return target;
}

export async function getSampleMealUri(): Promise<string> {
  return ensureFileUri(SAMPLE_MEAL, "sampleMeal.jpg");
}

export async function getSampleTableUri(): Promise<string> {
  return ensureFileUri(SAMPLE_TABLE, "sampleTable.jpg");
}

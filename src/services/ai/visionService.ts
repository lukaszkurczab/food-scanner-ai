import NetInfo from "@react-native-community/netinfo";
import { uriToBase64 } from "@/utils/uriToBase64";
import { convertToJpegAndResize } from "@/utils/convertToJpegAndResize";
import type { Ingredient } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { debugScope } from "@/utils/debug";
import {
  createServiceError,
  getErrorStatus,
  isServiceError,
} from "@/services/contracts/serviceError";
import { post } from "@/services/core/apiClient";
import { handleAiError } from "@/services/ai/handleAiError";
import type { AiPhotoAnalyzeResponse } from "@/services/ai/contracts";

const log = debugScope("Vision");
const AI_UNAVAILABLE_CODE = "ai/unavailable";

type VisionOpts = {
  lang?: string;
};

export type VisionAnalyzeResult = {
  ingredients: Ingredient[] | null;
  credits: AiPhotoAnalyzeResponse;
};

function normalizeBackendVisionPayload(
  payload: AiPhotoAnalyzeResponse,
): Ingredient[] | null {
  if (!Array.isArray(payload.ingredients) || payload.ingredients.length === 0) {
    return null;
  }

  return payload.ingredients.map((ingredient) => ({
    id: uuidv4(),
    name: ingredient.name,
    amount: ingredient.amount,
    unit: ingredient.unit ?? "g",
    protein: ingredient.protein,
    fat: ingredient.fat,
    carbs: ingredient.carbs,
    kcal: ingredient.kcal,
  }));
}

async function detectIngredientsWithBackend(
  userUid: string,
  imageBase64: string,
  userLang: string,
): Promise<VisionAnalyzeResult | null> {
  if (!userUid) return null;

  const response = await post<AiPhotoAnalyzeResponse>("/ai/photo/analyze", {
    imageBase64,
    lang: userLang,
  });

  return {
    ingredients: normalizeBackendVisionPayload(response),
    credits: response,
  };
}

export async function detectIngredientsWithVision(
  userUid: string,
  imageUri: string,
  opts?: VisionOpts,
): Promise<VisionAnalyzeResult | null> {
  const userLang = (opts?.lang || "pl").toLowerCase();

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    log.warn("blocked Vision call: offline");
    throw createServiceError({
      code: "offline",
      source: "VisionService",
      retryable: true,
    });
  }

  try {
    const jpegUri = await convertToJpegAndResize(imageUri, 512, 512, {
      userUid,
      fileId: `vision-${Date.now()}`,
      dir: "tmp",
    });
    const imageBase64 = await uriToBase64(jpegUri);

    return await detectIngredientsWithBackend(userUid, imageBase64, userLang);
  } catch (error) {
    if (getErrorStatus(error) === 402) {
      throw error;
    }

    if (
      isServiceError(error) &&
      (
        error.code === "offline" ||
        error.code === AI_UNAVAILABLE_CODE
      )
    ) {
      throw error;
    }

    return handleAiError(
      error,
      "VisionService",
      { userUid, lang: userLang },
      { action: "wrap-unavailable" },
    );
  }
}

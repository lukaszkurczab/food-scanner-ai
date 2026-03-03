import NetInfo from "@react-native-community/netinfo";
import { uriToBase64 } from "@/utils/uriToBase64";
import { convertToJpegAndResize } from "@/utils/convertToJpegAndResize";
import type { Ingredient } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { debugScope } from "@/utils/debug";
import { extractAndNormalizeIngredients } from "@/services/ai/ingredientParser";
import {
  createServiceError,
  isServiceError,
} from "@/services/contracts/serviceError";
import { post } from "@/services/apiClient";
import { withVersion } from "@/services/apiVersioning";
import { logError } from "@/services/errorLogger";

const log = debugScope("Vision");
const AI_UNAVAILABLE_CODE = "ai/unavailable";

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") {
    let s = String(v);
    s = s.replace(
      /(?<=\d)[\u00A0\u2000-\u200B\u202F\u205F\u3000\s](?=\d)/g,
      ".",
    );
    s = s.replace(/,(?=\d)/g, ".");
    s = s.replace(
      /(?<=\d)[.\u00A0\u2000-\u200B\u202F\u205F\u3000](?=\d{3}\b)/g,
      "",
    );
    const n = Number(s.replace(/[^0-9.+-]/g, ""));
    return isFinite(n) ? n : 0;
  }
  return 0;
};

const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

type VisionOpts = {
  isPremium?: boolean;
  limit?: number;
  lang?: string;
};

type VisionBackendResponse = {
  ingredients?: unknown;
  reply?: string;
  usageCount?: number;
  remaining?: number;
  version?: string;
};

function normalizeBackendVisionPayload(
  payload: VisionBackendResponse,
): Ingredient[] | null {
  const raw =
    typeof payload.reply === "string"
      ? payload.reply
      : Array.isArray(payload.ingredients)
        ? JSON.stringify(payload.ingredients)
        : null;

  if (!raw) return null;

  return extractAndNormalizeIngredients(
    raw,
    {
      idFactory: () => uuidv4(),
      toNumber,
      transformName: capFirst,
      allowMlUnit: true,
    },
    { allowRegexFallback: true },
  );
}

async function detectIngredientsWithBackend(
  userUid: string,
  imageBase64: string,
  userLang: string,
): Promise<Ingredient[] | null> {
  const response = await post<VisionBackendResponse>(withVersion("/ai/photo/analyze"), {
    userId: userUid,
    imageBase64,
    lang: userLang,
  });

  return normalizeBackendVisionPayload(response);
}

export async function detectIngredientsWithVision(
  userUid: string,
  imageUri: string,
  opts?: VisionOpts,
): Promise<Ingredient[] | null> {
  const isPremium = !!opts?.isPremium;
  const userLang = (opts?.lang || "pl").toLowerCase();

  if (!isPremium) {
    throw createServiceError({
      code: "ai/premium-required",
      source: "VisionService",
      retryable: false,
    });
  }

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
    if (
      isServiceError(error) &&
      (error.code === "offline" || error.code === "ai/premium-required")
    ) {
      throw error;
    }

    logError(
      "[visionService] backend photo analysis failed",
      { userUid, lang: userLang },
      error,
    );

    throw createServiceError({
      code: AI_UNAVAILABLE_CODE,
      source: "VisionService",
      retryable: true,
      cause: error,
    });
  }
}

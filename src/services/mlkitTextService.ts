import { Platform } from "react-native";

export type Rect = { x: number; y: number; width: number; height: number };

export type RecognizedLine = {
  text: string;
  bbox: Rect;
};

export type RecognizeTextResult = {
  text: string;
  lines: RecognizedLine[];
};

/**
 * Run on-device text recognition using Google ML Kit v2.
 * Returns the full recognized text and individual lines with bounding boxes.
 *
 * Note: Requires a Dev Client / EAS build. Not available in Expo Go.
 */
export async function recognizeText(uri: string): Promise<RecognizeTextResult> {
  // Lazy load to avoid static resolution issues if the native module isn't linked yet
  let TextRecognition: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-ml-kit/text-recognition");
    TextRecognition = mod?.default ?? mod;
  } catch (e) {
    throw new Error("mlkit/unavailable");
  }

  if (!TextRecognition?.recognize) {
    throw new Error("mlkit/unavailable");
  }

  const res: any = await TextRecognition.recognize(uri);

  const text: string = typeof res?.text === "string" ? res.text : "";
  const lines: RecognizedLine[] = [];

  const blocks: any[] = Array.isArray(res?.blocks) ? res.blocks : [];
  for (const b of blocks) {
    const rawLines: any[] = Array.isArray(b?.lines) ? b.lines : [];
    for (const l of rawLines) {
      const frame = l?.frame ?? {};
      const bbox: Rect = {
        x: Number(frame?.x ?? frame?.left ?? 0) || 0,
        y: Number(frame?.y ?? frame?.top ?? 0) || 0,
        width: Number(frame?.width ?? 0) || 0,
        height: Number(frame?.height ?? 0) || 0,
      };
      const t = typeof l?.text === "string" ? l.text : "";
      if (t) lines.push({ text: t, bbox });
    }
  }

  return { text, lines };
}


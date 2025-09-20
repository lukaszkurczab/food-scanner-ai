import * as Device from "expo-device";
import { debugScope } from "@/utils/debug";

export type Rect = { x: number; y: number; width: number; height: number };
export type RecognizedLine = { text: string; bbox: Rect };
export type RecognizeTextResult = { text: string; lines: RecognizedLine[] };

const log = debugScope("OCR:MLKit");

function toRect(frame: any, idx: number): Rect {
  const x = Number(frame?.x ?? frame?.left ?? 0) || 0;
  const y = Number(frame?.y ?? frame?.top ?? 0) || 0;
  const w = Number(frame?.width ?? frame?.w ?? 0) || 0;
  const h = Number(frame?.height ?? frame?.h ?? 0) || 0;
  if (!w || !h) return { x: 0, y: idx * 20, width: 1000, height: 20 };
  return { x, y, width: w, height: h };
}

async function devSimulatorFallback(): Promise<RecognizeTextResult> {
  const lines: RecognizedLine[] = [
    { text: "per 100 g    per portion", bbox: toRect({}, 0) },
    { text: "Energy  250 kcal   400 kcal", bbox: toRect({}, 1) },
    { text: "Protein  12 g   18 g", bbox: toRect({}, 2) },
    { text: "Fat  8 g   12 g", bbox: toRect({}, 3) },
    { text: "Carbohydrates  30 g   45 g", bbox: toRect({}, 4) },
  ];
  return { text: lines.map((l) => l.text).join("\n"), lines };
}

export async function recognizeText(uri: string): Promise<RecognizeTextResult> {
  if (!Device.isDevice && typeof __DEV__ !== "undefined" && __DEV__) {
    return devSimulatorFallback();
  }
  let TextRecognition: any;
  try {
    const mod = require("@react-native-ml-kit/text-recognition");
    TextRecognition = mod?.default ?? mod;
  } catch (e) {
    throw new Error("mlkit/unavailable");
  }
  if (!TextRecognition?.recognize) throw new Error("mlkit/unavailable");

  const res: any = await TextRecognition.recognize(uri);

  const lines: RecognizedLine[] = [];
  const text: string = typeof res?.text === "string" ? res.text : "";

  if (Array.isArray(res?.lines) && res.lines.length) {
    res.lines.forEach((l: any, i: number) => {
      const t = typeof l?.text === "string" ? l.text : "";
      if (t)
        lines.push({ text: t, bbox: toRect(l?.frame ?? l?.bounding ?? {}, i) });
    });
  } else {
    const blocks: any[] = Array.isArray(res?.blocks) ? res.blocks : [];
    blocks.forEach((b, bi) => {
      const raw: any[] = Array.isArray(b?.lines) ? b.lines : [];
      raw.forEach((l, li) => {
        const t = typeof l?.text === "string" ? l.text : "";
        if (t)
          lines.push({
            text: t,
            bbox: toRect(l?.frame ?? l?.bounding ?? {}, bi * 1000 + li),
          });
      });
    });
  }

  if (!lines.length && text) {
    text
      .split(/\r?\n+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t, i) => lines.push({ text: t, bbox: toRect({}, i) }));
  }
  return { text, lines };
}

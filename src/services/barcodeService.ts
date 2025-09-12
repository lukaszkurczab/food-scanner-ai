import type { Ingredient } from "@/types";
import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";

type OFFProduct = {
  product?: {
    product_name?: string;
    nutriments?: Record<string, any>;
    brands?: string;
    quantity?: string;
    serving_size?: string;
    categories_tags?: string[];
    nutrition_data_per?: string;
  };
  status?: number;
};

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(String(v).replace(/[^0-9.+-]/g, ""));
    return isFinite(n) ? n : 0;
  }
  return 0;
};

export async function fetchProductByBarcode(barcode: string): Promise<{ name: string; ingredient: Ingredient } | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as OFFProduct;
    if (!json || json.status !== 1 || !json.product) return null;
    const p = json.product;
    const name = decodeHtmlEntities((p.product_name || "") as string).trim();
    const n = p.nutriments || {};
    const kcal = toNumber(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? n["energy_100g"] ?? n["energy"]);
    const protein = toNumber(n["proteins_100g"] ?? n["proteins"]);
    const carbs = toNumber(n["carbohydrates_100g"] ?? n["carbohydrates"]);
    const fat = toNumber(n["fat_100g"] ?? n["fat"]);
    // Heuristic: determine unit for 100 based on product hints
    const q = String(p.quantity || "").toLowerCase();
    const srv = String(p.serving_size || "").toLowerCase();
    const tags: string[] = Array.isArray(p.categories_tags) ? p.categories_tags : [];
    const dataPer = String(p.nutrition_data_per || "").toLowerCase();
    const isBeverage = tags.some((t) => /beverage|drink|napoje|napój/i.test(String(t))) ||
      q.includes("ml") || srv.includes("ml");
    const unit: "g" | "ml" = isBeverage || dataPer.includes("100ml") ? "ml" : "g";
    const ingredient: Ingredient = {
      id: `${Date.now()}`,
      name: name || `Product ${barcode}`,
      amount: 100,
      unit,
      protein,
      fat,
      carbs,
      kcal,
    };
    return { name: ingredient.name, ingredient };
  } catch {
    return null;
  }
}

// Try to extract a standard EAN/UPC from arbitrary QR/barcode payloads
export function extractBarcodeFromPayload(payload: string): string | null {
  try {
    const s = String(payload || "").trim();
    if (!s) return null;
    const onlyDigits = s.replace(/\D+/g, "");
    // If payload is only digits and plausible length
    if (/^\d{8}$/.test(s) || /^\d{12}$/.test(s) || /^\d{13}$/.test(s)) return s;
    if (/^\d{8}$/.test(onlyDigits) || /^\d{12}$/.test(onlyDigits) || /^\d{13}$/.test(onlyDigits)) {
      return onlyDigits;
    }
    // GS1 AI 01 (GTIN-14)
    const ai01 = s.match(/(?:\(01\)|01)(\d{14})/);
    if (ai01) {
      const gtin14 = ai01[1];
      // Convert to EAN-13 by dropping leading 0 if present
      if (gtin14.length === 14) {
        const ean13 = gtin14.startsWith("0") ? gtin14.slice(1) : gtin14.slice(1);
        if (/^\d{13}$/.test(ean13)) return ean13;
      }
    }
    // OFF product URL
    const off = s.match(/openfoodfacts\.org\/(?:product|products)\/(\d{8,14})/i);
    if (off) {
      const raw = off[1];
      if (raw.length === 13 || raw.length === 12 || raw.length === 8) return raw;
      if (raw.length === 14 && raw.startsWith("0")) return raw.slice(1);
    }
    // Query params like ?ean= or ?gtin=
    const url = s.match(/(?:ean|gtin)=([0-9]{8,14})/i);
    if (url) {
      const raw = url[1];
      if (raw.length === 13 || raw.length === 12 || raw.length === 8) return raw;
      if (raw.length === 14 && raw.startsWith("0")) return raw.slice(1);
    }
    // Fallback: pick a 13-digit run if present, else 12, else 8
    const d13 = s.match(/\d{13}/);
    if (d13) return d13[0];
    const d12 = s.match(/\d{12}/);
    if (d12) return d12[0];
    const d8 = s.match(/\d{8}/);
    if (d8) return d8[0];
    return null;
  } catch {
    return null;
  }
}

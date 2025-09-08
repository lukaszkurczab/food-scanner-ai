import type { Ingredient } from "@/types";

type OFFProduct = {
  product?: {
    product_name?: string;
    nutriments?: Record<string, any>;
    brands?: string;
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
    const name = (p.product_name || "") as string;
    const n = p.nutriments || {};
    const kcal = toNumber(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? n["energy_100g"] ?? n["energy"]);
    const protein = toNumber(n["proteins_100g"] ?? n["proteins"]);
    const carbs = toNumber(n["carbohydrates_100g"] ?? n["carbohydrates"]);
    const fat = toNumber(n["fat_100g"] ?? n["fat"]);
    const ingredient: Ingredient = {
      id: `${Date.now()}`,
      name: name || `Product ${barcode}`,
      amount: 100,
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


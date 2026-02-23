import { asString, asStringArray, isRecord } from "@/services/contracts/guards";

export type OffProductDto = {
  status: number;
  product: {
    product_name: string;
    nutriments: Record<string, unknown>;
    quantity?: string;
    serving_size?: string;
    categories_tags: string[];
    nutrition_data_per?: string;
  };
};

export function parseOffProductResponse(payload: unknown): OffProductDto | null {
  if (!isRecord(payload)) return null;
  if (payload.status !== 1) return null;

  const productRaw = payload.product;
  if (!isRecord(productRaw)) return null;

  const nutrimentsRaw = productRaw.nutriments;
  const nutriments: Record<string, unknown> = isRecord(nutrimentsRaw)
    ? nutrimentsRaw
    : {};

  return {
    status: 1,
    product: {
      product_name: asString(productRaw.product_name) ?? "",
      nutriments,
      quantity: asString(productRaw.quantity),
      serving_size: asString(productRaw.serving_size),
      categories_tags: asStringArray(productRaw.categories_tags),
      nutrition_data_per: asString(productRaw.nutrition_data_per),
    },
  };
}


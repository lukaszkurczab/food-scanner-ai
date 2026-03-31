import type { Ingredient, Meal } from "@/types";

export function buildBarcodeDraft(params: {
  uid: string | null;
  existingMeal: Meal | null;
  mealId?: string;
  code: string;
  ingredient: Ingredient;
  productName: string;
}): Meal {
  const now = new Date().toISOString();
  const nextBase = params.existingMeal ?? {
    mealId: params.mealId ?? `barcode-${Date.now()}`,
    userUid: params.uid ?? "",
    name: null,
    photoUrl: null,
    ingredients: [],
    createdAt: now,
    updatedAt: now,
    syncState: "pending" as const,
    tags: [],
    deleted: false,
    notes: null,
    type: "other" as const,
    timestamp: "",
    source: null,
    inputMethod: "barcode" as const,
    aiMeta: null,
  };

  return {
    ...nextBase,
    mealId: nextBase.mealId ?? params.mealId ?? `barcode-${Date.now()}`,
    userUid: nextBase.userUid ?? params.uid ?? "",
    name: params.productName || nextBase.name,
    ingredients: [params.ingredient],
    timestamp: nextBase.timestamp || now,
    photoUrl: null,
    photoLocalPath: null,
    localPhotoUrl: null,
    imageId: null,
    notes: `barcode:${params.code}`,
    source: "manual",
    inputMethod: "barcode",
    aiMeta: null,
    updatedAt: now,
  };
}

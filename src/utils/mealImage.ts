import * as FileSystem from "@/services/core/fileSystem";
import { ensureLocalMealPhoto } from "@/services/meals/mealService.images";
import type { Meal } from "@/types/meal";

const isLocalUri = (value?: string | null) =>
  !!value && (value.startsWith("file://") || value.startsWith("content://"));

export function pickMealPhotoUri(meal?: Meal | null): string | null {
  if (!meal) return null;

  const localCandidate = [
    meal.photoUrl,
    meal.photoLocalPath,
    meal.localPhotoUrl,
  ].find(isLocalUri);
  if (localCandidate) return localCandidate;

  return meal.photoUrl ?? meal.localPhotoUrl ?? meal.photoLocalPath ?? null;
}

async function firstExistingLocalUri(meal: Meal): Promise<string | null> {
  const candidates = [meal.localPhotoUrl, meal.photoLocalPath, meal.photoUrl].filter(
    isLocalUri
  ) as string[];

  for (const uri of candidates) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) return uri;
    } catch {
      continue;
    }
  }

  return null;
}

export async function getMealImage(meal: Meal): Promise<string | null> {
  const existingLocal = await firstExistingLocalUri(meal);
  if (existingLocal) return existingLocal;

  const ensuredLocal = await ensureLocalMealPhoto({
    uid: meal.userUid,
    cloudId: meal.cloudId ?? null,
    imageId: meal.imageId ?? null,
    photoUrl: meal.photoUrl ?? null,
  });
  if (ensuredLocal) return ensuredLocal;

  return meal.photoUrl ?? null;
}

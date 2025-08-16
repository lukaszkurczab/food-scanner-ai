import { Model } from "@nozbe/watermelondb";
import { field, json } from "@nozbe/watermelondb/decorators";

function sanitizeArray(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default class MyMeal extends Model {
  static table = "myMeals";

  @field("userUid") userUid!: string;
  @field("mealId") mealId!: string;
  @field("timestamp") timestamp!: string;
  @field("type") type!: string;
  @field("name") name!: string | null;
  @json("ingredients", sanitizeArray) ingredients!: any[];
  @field("createdAt") createdAt!: string;
  @field("updatedAt") updatedAt!: string;
  @field("syncState") syncState!: string;
  @field("source") source!: string;
  @field("photoUrl") photoUrl?: string | null;
  @field("notes") notes?: string | null;
  @json("tags", sanitizeArray) tags?: string[];
  @field("deleted") deleted?: boolean;
  @field("cloudId") cloudId?: string;
}

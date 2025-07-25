import { Model } from "@nozbe/watermelondb";
import { field, json } from "@nozbe/watermelondb/decorators";

function sanitizeArray(raw: any): string[] {
  return Array.isArray(raw) ? raw : [];
}

export default class Meal extends Model {
  static table = "meals";

  @field("user_uid") userUid!: string;
  @field("name") name!: string;
  @field("date") date!: string;
  @field("photo_uri") photoUri?: string;
  @field("kcal") kcal!: number;
  @field("carbs") carbs!: number;
  @field("fat") fat!: number;
  @field("protein") protein!: number;
  @json("ingredients", sanitizeArray) ingredients!: string[];
  @field("meal_type") mealType?: string;
  @field("source") source!: string;
  @field("sync_status") syncState!: string;
  @field("last_updated") lastUpdated!: string;
  @field("deleted") deleted?: boolean;
}

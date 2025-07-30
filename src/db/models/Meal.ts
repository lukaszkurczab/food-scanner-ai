import { Model } from "@nozbe/watermelondb";
import { field, json } from "@nozbe/watermelondb/decorators";

function sanitizeArray(raw: any): string[] {
  return Array.isArray(raw) ? raw : [];
}

export default class Meal extends Model {
  static table = "meals";

  @field("userUid") userUid!: string;
  @field("name") name!: string;
  @field("date") date!: string;
  @field("photoUri") photoUri?: string;
  @field("kcal") kcal!: number;
  @field("carbs") carbs!: number;
  @field("fat") fat!: number;
  @field("protein") protein!: number;
  @json("ingredients", sanitizeArray) ingredients!: string[];
  @field("mealType") mealType?: string;
  @field("source") source!: string;
  @field("syncState") syncState!: string;
  @field("lastUpdated") lastUpdated!: string;
  @field("deleted") deleted?: boolean;
}

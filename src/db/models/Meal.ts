import { Model } from "@nozbe/watermelondb";
import { field, json } from "@nozbe/watermelondb/decorators";

function sanitizeArray(raw: any): any[] {
  return Array.isArray(raw) ? raw : [];
}

export default class Meal extends Model {
  static table = "meals";

  @field("mealId") mealId!: string;
  @field("timestamp") timestamp!: string;
  @field("type") type!: string;
  @field("photoUrl") photoUrl?: string;
  @field("notes") notes?: string;
  @json("ingredients", sanitizeArray) ingredients!: any[];
  @field("createdAt") createdAt!: string;
  @field("updatedAt") updatedAt!: string;
  @field("source") source?: string;
  @field("syncState") syncState?: string;
  @json("tags", sanitizeArray) tags?: string[];
  @field("deleted") deleted?: boolean;
  @field("cloudId") cloudId?: string;
}

import { Model } from "@nozbe/watermelondb";
import { field, json } from "@nozbe/watermelondb/decorators";

function sanitizeArray(raw: any): string[] {
  return Array.isArray(raw) ? raw : [];
}

export default class User extends Model {
  static table = "users";

  @field("uid") uid!: string;
  @field("email") email!: string;
  @field("username") username?: string;
  @field("created_at") createdAt!: number;
  @field("last_login") lastLogin!: string;
  @field("plan") plan!: string;

  @field("units_system") unitsSystem!: string;
  @field("age") age!: string;
  @field("sex") sex!: string;
  @field("height") height!: string;
  @field("height_inch") heightInch?: string;
  @field("weight") weight!: string;
  @json("preferences", sanitizeArray) preferences!: string[];
  @field("activity_level") activityLevel!: string;
  @field("goal") goal!: string;
  @field("calorie_deficit") calorieDeficit?: number;
  @field("calorie_surplus") calorieSurplus?: number;
  @json("chronic_diseases", sanitizeArray) chronicDiseases?: string[];
  @field("chronic_diseases_other") chronicDiseasesOther?: string;
  @json("allergies", sanitizeArray) allergies?: string[];
  @field("allergies_other") allergiesOther?: string;
  @field("lifestyle") lifestyle?: string;
  @field("ai_style") aiStyle?: string;
  @field("ai_focus") aiFocus?: string;
  @field("ai_focus_other") aiFocusOther?: string;
  @field("ai_note") aiNote?: string;

  @field("sync_status") syncState!: string;
  @field("last_synced_at") lastSyncedAt?: string;
}

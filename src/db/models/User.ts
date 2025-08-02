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
  @field("createdAt") createdAt!: number;
  @field("lastLogin") lastLogin!: string;
  @field("plan") plan!: string;
  @field("language") language!: string;

  @field("unitsSystem") unitsSystem!: string;
  @field("age") age!: string;
  @field("sex") sex!: string;
  @field("height") height!: string;
  @field("heightInch") heightInch?: string;
  @field("weight") weight!: string;
  @json("preferences", sanitizeArray) preferences!: string[];
  @field("activityLevel") activityLevel!: string;
  @field("goal") goal!: string;
  @field("calorieDeficit") calorieDeficit?: number;
  @field("calorieSurplus") calorieSurplus?: number;
  @json("chronicDiseases", sanitizeArray) chronicDiseases?: string[];
  @field("chronicDiseasesOther") chronicDiseasesOther?: string;
  @json("allergies", sanitizeArray) allergies?: string[];
  @field("allergiesOther") allergiesOther?: string;
  @field("lifestyle") lifestyle?: string;
  @field("aiStyle") aiStyle?: string;
  @field("aiFocus") aiFocus?: string;
  @field("aiFocusOther") aiFocusOther?: string;
  @field("aiNote") aiNote?: string;
  @field("surveyComplited") surveyComplited!: boolean;
  @field("syncState")
  syncState!: string;
  @field("lastSyncedAt") lastSyncedAt?: string;
  @field("darkTheme") darkTheme?: boolean;
  @field("avatarUrl") avatarUrl?: string;
  @field("avatarLocalPath") avatarLocalPath?: string;
  @field("avatarlastSyncedAt") avatarlastSyncedAt?: string;
}

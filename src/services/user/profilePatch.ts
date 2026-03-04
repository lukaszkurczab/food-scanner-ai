import type { UserData } from "@/types";

const EDITABLE_PROFILE_FIELDS = new Set<keyof UserData>([
  "unitsSystem",
  "age",
  "sex",
  "height",
  "heightInch",
  "weight",
  "preferences",
  "activityLevel",
  "goal",
  "calorieDeficit",
  "calorieSurplus",
  "chronicDiseases",
  "chronicDiseasesOther",
  "allergies",
  "allergiesOther",
  "lifestyle",
  "aiStyle",
  "aiFocus",
  "aiFocusOther",
  "aiNote",
  "surveyComplited",
  "surveyCompletedAt",
  "calorieTarget",
  "darkTheme",
  "language",
]);

export function sanitizeUserProfilePatch(
  payload: Partial<UserData>,
): Partial<UserData> {
  const patch: Partial<UserData> = {};
  const mutablePatch = patch as Record<
    keyof UserData,
    UserData[keyof UserData] | undefined
  >;

  for (const [key, value] of Object.entries(payload) as Array<
    [keyof UserData, UserData[keyof UserData]]
  >) {
    if (!EDITABLE_PROFILE_FIELDS.has(key)) {
      continue;
    }
    if (value === undefined) {
      continue;
    }
    mutablePatch[key] = value;
  }

  return patch;
}

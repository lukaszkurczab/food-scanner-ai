import type { FormData } from "@/src/types";

export interface Survey {
  id: string;
  userUid: string;
  formData: FormData;
  completedAt: string;
  syncStatus: "synced" | "pending" | "conflict";
}

export const INITIAL_FORM: FormData = {
  unitsSystem: "metric",
  age: "",
  sex: "male",
  height: "",
  weight: "",
  preferences: [],
  activityLevel: "moderate",
  goal: "maintain",
  calorieDeficit: 0.3,
  calorieSurplus: 0.3,
  chronicDiseases: [],
  chronicDiseasesOther: "",
  allergies: [],
  allergiesOther: "",
  lifestyle: "",
  aiStyle: "none",
  aiFocus: "none",
  aiFocusOther: "",
  aiNote: "",
  surveyComplited: true,
};

function safeParseFormData(str: string): FormData {
  try {
    if (!str || str.trim() === "") return INITIAL_FORM;
    return JSON.parse(str);
  } catch (e) {
    console.error("Błąd parsowania form_data:", str, e);
    return INITIAL_FORM;
  }
}

export function mapRawToSurvey(raw: any): Survey {
  return {
    id: raw.id,
    userUid: raw.user_uid,
    formData:
      typeof raw.form_data === "string"
        ? safeParseFormData(raw.form_data)
        : raw.form_data,
    completedAt: raw.completed_at,
    syncStatus: raw.sync_status,
  };
}

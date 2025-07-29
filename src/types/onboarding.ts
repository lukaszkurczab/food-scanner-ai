export type UnitsSystem = "metric" | "imperial";

export type Sex = "male" | "female" | null;

export type Goal = "lose" | "maintain" | "increase";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type Preference =
  | "lowCarb"
  | "keto"
  | "highProtein"
  | "highCarb"
  | "lowFat"
  | "balanced"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "mediterranean"
  | "glutenFree"
  | "dairyFree"
  | "paleo";

export type ChronicDisease =
  | "none"
  | "diabetes"
  | "hypertension"
  | "asthma"
  | "other";

export type Allergy = "none" | "peanuts" | "gluten" | "lactose" | "other";

export type AiStyle = "none" | "concise" | "friendly" | "detailed";

export type AiFocus =
  | "none"
  | "mealPlanning"
  | "analyzingMistakes"
  | "quickAnswers"
  | "motivation"
  | "other";

export type FormData = {
  unitsSystem: UnitsSystem;
  age: string;
  sex: Sex;
  height: string;
  heightInch?: string;
  weight: string;
  preferences: Preference[];
  activityLevel: ActivityLevel | "";
  goal: Goal | "";
  calorieDeficit?: number;
  calorieSurplus?: number;
  chronicDiseases?: ChronicDisease[];
  chronicDiseasesOther?: string;
  allergies?: Allergy[];
  allergiesOther?: string;
  lifestyle?: string;
  aiStyle?: AiStyle;
  aiFocus?: AiFocus;
  aiFocusOther?: string;
  aiNote?: string;
  surveyComplited: boolean;
};

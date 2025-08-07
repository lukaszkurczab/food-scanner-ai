import type { FormData } from "@/src/types";

export function calculateCalorieTarget(form: FormData): number {
  const weight = Number(form.weight);
  const height = Number(form.height);
  const age = Number(form.age);
  const sex = form.sex;

  let weightKg = weight;
  let heightCm = height;

  if (form.unitsSystem === "imperial") {
    weightKg = weight * 0.453592;

    if (form.heightInch) {
      heightCm = Number(form.heightInch) * 2.54;
    } else {
      heightCm = height * 2.54;
    }
  }

  if (!weightKg || !heightCm || !age || !sex) return 0;

  let bmr = 0;
  if (sex === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (sex === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    return 0;
  }

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const multiplier = activityMultipliers[form.activityLevel] ?? 1.2;
  let tdee = bmr * multiplier;
  let calorieTarget = tdee;

  if (form.goal === "lose") {
    const deficit =
      typeof form.calorieDeficit === "number" ? form.calorieDeficit : 0.15;
    calorieTarget = tdee * (1 - deficit);
  } else if (form.goal === "increase") {
    const surplus =
      typeof form.calorieSurplus === "number" ? form.calorieSurplus : 0.1;
    calorieTarget = tdee * (1 + surplus);
  }

  calorieTarget = Math.round(calorieTarget);

  if (calorieTarget < 1000 || calorieTarget > 6000) return 0;

  return calorieTarget;
}

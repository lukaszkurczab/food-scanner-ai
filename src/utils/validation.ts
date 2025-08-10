import { Meal } from "@/src/types/index";

export function validateEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validateMeal(m: Meal) {
  const errors: string[] = [];
  if (!m.ingredients || m.ingredients.length === 0) errors.push("ingredients");
  const s = m.ingredients.reduce(
    (acc, i) => ({
      kcal: acc.kcal + Math.max(0, i.kcal),
      p: acc.p + Math.max(0, i.protein),
      c: acc.c + Math.max(0, i.carbs),
      f: acc.f + Math.max(0, i.fat),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
  if (s.kcal > 3000) errors.push("kcal");
  if (s.p > 300 || s.c > 300 || s.f > 300) errors.push("macros");
  return { valid: errors.length === 0, errors };
}

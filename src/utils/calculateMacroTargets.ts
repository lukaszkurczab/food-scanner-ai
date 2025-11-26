import type { Preference, Goal } from "@/types";

export type MacroTargets = {
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  proteinKcal: number;
  fatKcal: number;
  carbsKcal: number;
};

type MacroStyle =
  | "balanced"
  | "highProtein"
  | "lowCarb"
  | "highCarb"
  | "lowFat"
  | "keto"
  | "mediterranean"
  | "paleo";

const STYLE_PRIORITY: { pref: Preference; style: MacroStyle }[] = [
  { pref: "keto", style: "keto" },
  { pref: "lowCarb", style: "lowCarb" },
  { pref: "highCarb", style: "highCarb" },
  { pref: "lowFat", style: "lowFat" },
  { pref: "highProtein", style: "highProtein" },
  { pref: "mediterranean", style: "mediterranean" },
  { pref: "paleo", style: "paleo" },
  { pref: "balanced", style: "balanced" },
];

function pickStyle(preferences?: Preference[]): MacroStyle {
  if (!preferences || preferences.length === 0) return "balanced";
  for (const { pref, style } of STYLE_PRIORITY) {
    if (preferences.includes(pref)) return style;
  }
  return "balanced";
}

function getBaseRatios(style: MacroStyle): {
  proteinPct: number;
  fatPct: number;
  carbPct: number;
} {
  switch (style) {
    case "keto":
      return { proteinPct: 0.2, fatPct: 0.7, carbPct: 0.1 };
    case "lowCarb":
      return { proteinPct: 0.3, fatPct: 0.4, carbPct: 0.3 };
    case "highCarb":
      return { proteinPct: 0.25, fatPct: 0.2, carbPct: 0.55 };
    case "lowFat":
      return { proteinPct: 0.25, fatPct: 0.15, carbPct: 0.6 };
    case "highProtein":
      return { proteinPct: 0.3, fatPct: 0.25, carbPct: 0.45 };
    case "mediterranean":
      return { proteinPct: 0.2, fatPct: 0.35, carbPct: 0.45 };
    case "paleo":
      return { proteinPct: 0.3, fatPct: 0.35, carbPct: 0.35 };
    case "balanced":
    default:
      return { proteinPct: 0.25, fatPct: 0.3, carbPct: 0.45 };
  }
}

function adjustForGoal(
  ratios: { proteinPct: number; fatPct: number; carbPct: number },
  goal?: Goal | ""
) {
  if (!goal || goal === "maintain") return ratios;

  if (goal === "lose") {
    const proteinPct = Math.min(ratios.proteinPct + 0.05, 0.35);
    const carbPct = Math.max(ratios.carbPct - 0.05, 0.25);
    const fatPct = 1 - proteinPct - carbPct;
    return { proteinPct, fatPct, carbPct };
  }

  if (goal === "increase") {
    const carbPct = Math.min(ratios.carbPct + 0.05, 0.6);
    const fatPct = Math.max(ratios.fatPct - 0.05, 0.2);
    const proteinPct = 1 - fatPct - carbPct;
    return { proteinPct, fatPct, carbPct };
  }

  return ratios;
}

function roundTo5(x: number) {
  return Math.round(x / 5) * 5;
}

export function calculateMacroTargets(params: {
  calorieTarget: number;
  preferences?: Preference[];
  goal?: Goal | "";
}): MacroTargets | null {
  const calorieTarget = Math.round(params.calorieTarget || 0);
  if (!calorieTarget || calorieTarget <= 0) return null;

  const style = pickStyle(params.preferences);
  const base = getBaseRatios(style);
  const { proteinPct, fatPct, carbPct } = adjustForGoal(base, params.goal);

  const proteinKcal = calorieTarget * proteinPct;
  const fatKcal = calorieTarget * fatPct;
  const carbsKcal = calorieTarget * carbPct;

  const proteinGrams = roundTo5(proteinKcal / 4);
  const fatGrams = roundTo5(fatKcal / 9);
  const carbsGrams = roundTo5(carbsKcal / 4);

  return {
    proteinGrams,
    fatGrams,
    carbsGrams,
    proteinKcal: Math.round(proteinGrams * 4),
    fatKcal: Math.round(fatGrams * 9),
    carbsKcal: Math.round(carbsGrams * 4),
  };
}

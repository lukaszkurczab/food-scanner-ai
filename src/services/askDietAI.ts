import OpenAI from "openai";
import Constants from "expo-constants";
import i18next from "i18next";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type {
  Meal,
  FormData,
  ChronicDisease,
  Preference,
  Allergy,
} from "@/types";
import { canUseAiToday, consumeAiUse } from "./userService";

export type Message = { from: "user" | "ai"; text: string };

type DietContext = {
  flags: string[];
  tone: "N" | "C" | "D" | "F";
  focus: "DEF" | "MP" | "AM" | "QA" | "M";
  avoid: string[];
};

const rawKey = Constants.expoConfig?.extra?.openaiApiKey;
const apiKey = rawKey?.trim();
const openai = new OpenAI({ apiKey });

function buildDietContext(p: FormData): DietContext {
  const flags: string[] = [];
  const avoid: string[] = [];
  const pref = (v: Preference) => p.preferences?.includes(v);
  const dis = (v: ChronicDisease) => p.chronicDiseases?.includes(v);
  const alg = (v: Allergy) => p.allergies?.includes(v);

  if (pref("vegan")) {
    flags.push("vegan");
    avoid.push(
      "mięso",
      "wołowina",
      "kurczak",
      "ryba",
      "tuńczyk",
      "łosoś",
      "jaja",
      "mleko",
      "ser",
      "jogurt"
    );
  } else if (pref("vegetarian")) {
    flags.push("vegetarian");
    avoid.push("mięso", "ryba", "tuńczyk", "łosoś", "kurczak", "wołowina");
  }

  if (pref("pescatarian")) flags.push("pescatarian");
  if (pref("keto")) flags.push("keto");
  if (pref("lowCarb")) flags.push("lowCarb");
  if (pref("highProtein")) flags.push("highProtein");
  if (pref("lowFat")) flags.push("lowFat");

  if (pref("glutenFree") || alg("gluten")) {
    flags.push("glutenFree");
    avoid.push(
      "pszenica",
      "jęczmień",
      "żyto",
      "makaron pszenny",
      "pieczywo pszenne"
    );
  }

  if (pref("dairyFree") || alg("lactose")) {
    flags.push("dairyFree");
    avoid.push("mleko", "ser", "jogurt", "kefir", "maślanka", "serwatka");
  }

  if (alg("peanuts")) {
    flags.push("noPeanuts");
    avoid.push("orzeszki ziemne", "masło orzechowe");
  }

  if (dis("diabetes")) flags.push("diabetes");
  if (dis("hypertension")) flags.push("hypertension");

  const tone: DietContext["tone"] =
    p.aiStyle === "concise"
      ? "C"
      : p.aiStyle === "detailed"
      ? "D"
      : p.aiStyle === "friendly"
      ? "F"
      : "N";

  const focus: DietContext["focus"] =
    p.aiFocus === "mealPlanning"
      ? "MP"
      : p.aiFocus === "analyzingMistakes"
      ? "AM"
      : p.aiFocus === "quickAnswers"
      ? "QA"
      : p.aiFocus === "motivation"
      ? "M"
      : "DEF";

  return { flags, tone, focus, avoid };
}

function compactProfile(p: FormData) {
  const toNum = (v: any) =>
    v === null || v === undefined ? undefined : Number(v);

  const obj: any = {
    g: p.goal || undefined,
    act: p.activityLevel || undefined,
    s: p.sex || undefined,
    a: toNum(p.age),
    h: p.unitsSystem === "metric" ? toNum(p.height) : undefined,
    w: toNum(p.weight),
    kcal:
      typeof p.calorieTarget === "number"
        ? p.calorieTarget
        : toNum(p.calorieTarget),
    lang: i18next.language || "en",
    unit: p.unitsSystem || "metric",
  };

  return JSON.stringify(obj);
}

function mealsSummary(meals: Meal[]) {
  if (!meals?.length) return "none";
  const items = meals
    .slice()
    .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
    .slice(0, 5)
    .map((m) => {
      const d = (m.timestamp || m.createdAt || "").slice(0, 10);
      const n = m.name || m.type || "meal";
      return `${d}:${n}`;
    });
  return `${meals.length}|${items.join(",")}`;
}

function ensureFullSentence(text: string): string {
  const t = text.trim();
  const i = Math.max(
    t.lastIndexOf("."),
    t.lastIndexOf("!"),
    t.lastIndexOf("?")
  );
  if (i >= 0) return t.slice(0, i + 1);
  const words = t.split(/\s+/).slice(0, 150).join(" ");
  return words.replace(/[–—,;:…-]+$/, "").trim() + ".";
}

const MAX_TOKENS = 260;

function enforceDietConstraints(output: string, banned: string[]): string {
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hit = banned.find((k) =>
    new RegExp(`\\b${escapeRegex(k)}\\b`, "i").test(output)
  );
  if (!hit) return output;

  const replaced = output.replace(
    new RegExp(`\\b${escapeRegex(hit)}\\b`, "ig"),
    i18next.t("diet.replacement", "substitute")
  );

  return (
    replaced +
    "\n\n" +
    i18next.t(
      "diet.constraintsNote",
      "(I respected your restrictions and suggested substitutions.)"
    )
  );
}

function looksMedical(q: string) {
  const s = q.toLowerCase();
  const needles = [
    "diagnos",
    "treat",
    "therapy",
    "medication",
    "dose",
    "prescription",
    "antibiotic",
    "insulin",
    "blood pressure",
    "hypertension crisis",
    "chest pain",
    "shortness of breath",
    "emergency",
    "symptom",
    "symptoms",
    "doctor",
    "hospital",
    "allergic reaction",
    "anaphyl",
    "pregnan",
    "cancer",
    "tumor",
    "stroke",
    "heart attack",
    "depression",
    "suicid",
  ];
  return needles.some((k) => s.includes(k));
}

export async function askDietAI(
  question: string,
  meals: Meal[],
  chatHistory: Message[],
  profile: FormData,
  opts?: { uid?: string; isPremium?: boolean; limit?: number }
): Promise<string> {
  const lang = i18next.language || "en";
  const outOfScopeReply = i18next.t(
    "diet.outOfScope",
    "Sorry — I can only help with questions about food, nutrition, meals, calories, and eating habits."
  );
  const medicalRedirect = i18next.t(
    "diet.medicalRedirect",
    "I can’t help with diagnosis or treatment. If this is about symptoms, medication, or a health issue, please contact a qualified clinician. I can still help with general nutrition and meal ideas that fit your preferences."
  );

  const uid = opts?.uid || "";
  const isPremium = !!opts?.isPremium;
  const limit = opts?.limit ?? 1;

  if (!isPremium && uid) {
    const allowed = await canUseAiToday(uid, isPremium, limit);
    if (!allowed) throw new Error("ai/daily-limit-reached");
  }

  if (looksMedical(question)) {
    const safe = ensureFullSentence(medicalRedirect);
    if (!isPremium && uid) {
      await consumeAiUse(uid, isPremium, limit);
    }
    return safe;
  }

  const dc = buildDietContext(profile);
  const prof = compactProfile(profile);
  const mealsComp = mealsSummary(meals);
  const hist = chatHistory.slice(-2).map((m) => m.text);

  const system =
    "ROLE: nutrition_assistant\n" +
    `LANG: ${lang}\n` +
    "WORDS_MAX: 150\n" +
    `OUT_OF_SCOPE_REPLY: "${outOfScopeReply.replace(/"/g, '\\"')}"\n` +
    `MEDICAL_REDIRECT: "${medicalRedirect.replace(/"/g, '\\"')}"\n` +
    "RULES:\n" +
    "1) You provide general nutrition guidance only; you are not a doctor or dietitian.\n" +
    "2) Never provide diagnosis, treatment plans, medication advice, dosages, or emergency guidance.\n" +
    "3) If Q asks about symptoms, medication, diagnosis, treatment, or medical emergencies: reply EXACTLY with MEDICAL_REDIRECT and nothing else.\n" +
    "4) Use MEALS if available; when asked about past meals, answer from MEALS.\n" +
    "5) Respect FLAGS. Prioritize allergies and stated health conditions by offering safe, conservative nutrition suggestions.\n" +
    "6) Suggest substitutions instead of banning foods.\n" +
    "7) Finish with a complete sentence.\n" +
    "8) If Q is not about diet, food, nutrition, meals, calories or eating habits, reply EXACTLY with OUT_OF_SCOPE_REPLY and nothing else.\n";

  const payload = JSON.stringify({
    Q: question,
    PROFILE: prof,
    MEALS: mealsComp,
    FLAGS: dc.flags,
    TONE: dc.tone,
    FOCUS: dc.focus,
    HIST: hist,
  });

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: payload } as ChatCompletionMessageParam,
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.3,
  });

  let text =
    resp.choices[0]?.message?.content?.trim() ||
    i18next.t("diet.errors.empty", "No response.");
  text = enforceDietConstraints(text, dc.avoid);
  text = ensureFullSentence(text);

  if (!isPremium && uid) {
    await consumeAiUse(uid, isPremium, limit);
  }

  return text;
}

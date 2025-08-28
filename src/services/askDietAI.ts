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

const MAX_WORDS = 150;
const MAX_TOKENS = 260;

function enforceDietConstraints(output: string, banned: string[]): string {
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hit = banned.find((k) =>
    new RegExp(`\\b${escapeRegex(k)}\\b`, "i").test(output)
  );
  if (!hit) return output;
  const replaced = output.replace(
    new RegExp(`\\b${escapeRegex(hit)}\\b`, "ig"),
    i18next.t("diet.replacement", "zamiennik")
  );
  return (
    replaced +
    "\n\n" +
    i18next.t(
      "diet.constraintsNote",
      "(Uwzględniłem ograniczenia – zaproponowałem zamienniki.)"
    )
  );
}

export async function askDietAI(
  question: string,
  meals: Meal[],
  chatHistory: Message[],
  profile: FormData
): Promise<string> {
  const dc = buildDietContext(profile);
  const prof = compactProfile(profile);
  const mealsComp = mealsSummary(meals);
  const hist = chatHistory.slice(-2).map((m) => m.text);
  const lang = i18next.language || "pl";

  const system =
    "ROLE: dietitian\n" +
    "LANG: {{lang}}\n" +
    "WORDS_MAX: 150\n" +
    "RULES: Use MEALS if available; when asked about past meals, answer from MEALS. Respect FLAGS. Prioritize allergies/medical. Suggest substitutions. No medical advice. Finish with a complete sentence.\n";

  const sys = system.replace("{{lang}}", lang);

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
      { role: "system", content: sys },
      { role: "user", content: payload },
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.3,
  });

  let text =
    resp.choices[0]?.message?.content?.trim() ||
    i18next.t("diet.errors.empty", "Brak odpowiedzi.");

  text = enforceDietConstraints(text, dc.avoid);
  text = ensureFullSentence(text);
  return text;
}

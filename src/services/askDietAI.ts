import OpenAI from "openai";
import Constants from "expo-constants";
import i18next from "i18next";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { Meal, FormData } from "@/types";

export type Message = {
  from: "user" | "ai";
  text: string;
};

type DietContext = {
  rules: string[];
  prefers: string[];
  avoid: string[];
  tone: string;
  focus: string;
};

function buildDietContext(p: FormData): DietContext {
  const rules: string[] = [
    i18next.t(
      "diet.rules.goalActivity",
      "Dostosuj zalecenia do celu (lose/maintain/increase) i aktywności."
    ),
    i18next.t(
      "diet.rules.safeRanges",
      "Udzielaj porad w bezpiecznych zakresach i unikaj skrajności."
    ),
  ];
  const prefers: string[] = [];
  const avoid: string[] = [];
  if (p.preferences.includes("vegan")) {
    rules.push(
      i18next.t(
        "diet.rules.vegan",
        "Nie proponuj mięsa, ryb, owoców morza, jaj ani nabiału."
      )
    );
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
    prefers.push(
      i18next.t(
        "diet.prefers.veganProteins",
        "roślinne białka (tofu, tempeh, strączki)"
      ),
      i18next.t("diet.prefers.wholeGrains", "pełne ziarna"),
      i18next.t("diet.prefers.vegFruit", "warzywa, owoce"),
      i18next.t("diet.prefers.nutsSeeds", "orzechy i nasiona")
    );
  } else if (p.preferences.includes("vegetarian")) {
    rules.push(
      i18next.t(
        "diet.rules.vegetarian",
        "Nie proponuj mięsa ani ryb; nabiał i jaja dozwolone, jeśli nie kolidują z innymi ograniczeniami."
      )
    );
    avoid.push("mięso", "ryba", "tuńczyk", "łosoś", "kurczak", "wołowina");
    prefers.push(
      i18next.t(
        "diet.prefers.vegetarianSources",
        "jaja, nabiał, strączki, tofu, produkty zbożowe pełnoziarniste"
      )
    );
  }
  if (p.preferences.includes("pescatarian"))
    prefers.push(i18next.t("diet.prefers.fishSeafood", "ryby i owoce morza"));
  if (p.preferences.includes("keto"))
    rules.push(
      i18next.t(
        "diet.rules.keto",
        "Utrzymuj niski poziom węglowodanów, wyższy tłuszcz."
      )
    );
  if (p.preferences.includes("lowCarb"))
    rules.push(
      i18next.t("diet.rules.lowCarb", "Preferuj niski ładunek glikemiczny.")
    );
  if (p.preferences.includes("highProtein"))
    rules.push(
      i18next.t("diet.rules.highProtein", "Dbaj o wysoką podaż białka.")
    );
  if (p.preferences.includes("lowFat"))
    rules.push(i18next.t("diet.rules.lowFat", "Ograniczaj tłuszcz nasycony."));
  if (p.preferences.includes("glutenFree")) {
    rules.push(i18next.t("diet.rules.glutenFree", "Unikaj glutenu."));
    avoid.push(
      "pszenica",
      "jęczmień",
      "żyto",
      "makaron pszenny",
      "pieczywo pszenne"
    );
  }
  if (p.preferences.includes("dairyFree")) {
    rules.push(i18next.t("diet.rules.dairyFree", "Unikaj nabiału."));
    avoid.push("mleko", "ser", "jogurt", "maślanka", "śmietana");
  }
  if (p.preferences.includes("mediterranean"))
    prefers.push(
      i18next.t(
        "diet.prefers.mediterranean",
        "oliwa, ryby, warzywa, rośliny strączkowe, pełne ziarna, orzechy"
      )
    );
  if (p.preferences.includes("paleo"))
    rules.push(
      i18next.t(
        "diet.rules.paleo",
        "Bez zbóż, nabiału i produktów przetworzonych."
      )
    );
  if (p.allergies?.includes("peanuts")) {
    rules.push(
      i18next.t(
        "diet.rules.noPeanuts",
        "Nigdy nie proponuj orzeszków ziemnych."
      )
    );
    avoid.push("orzeszki ziemne", "masło orzechowe");
  }
  if (p.allergies?.includes("gluten")) {
    rules.push(
      i18next.t(
        "diet.rules.noGluten",
        "Nigdy nie proponuj produktów z glutenem."
      )
    );
    avoid.push("pszenica", "jęczmień", "żyto");
  }
  if (p.allergies?.includes("lactose") || p.preferences.includes("dairyFree")) {
    rules.push(
      i18next.t(
        "diet.rules.noLactose",
        "Nie proponuj produktów mlecznych zawierających laktozę; sugeruj roślinne zamienniki."
      )
    );
    avoid.push("mleko", "ser", "jogurt", "kefir", "maślanka", "serwatka");
  }
  if (p.chronicDiseases?.includes("diabetes"))
    rules.push(
      i18next.t(
        "diet.rules.diabetes",
        "Preferuj niski ładunek glikemiczny, unikanie cukrów prostych."
      )
    );
  if (p.chronicDiseases?.includes("hypertension"))
    rules.push(
      i18next.t(
        "diet.rules.hypertension",
        "Ograniczaj sól sodową, preferuj potas, warzywa, DASH-like."
      )
    );
  const tone =
    p.aiStyle === "concise"
      ? i18next.t("diet.tone.concise", "Krótko i konkretnie (3–6 zdań).")
      : p.aiStyle === "detailed"
      ? i18next.t("diet.tone.detailed", "Szczegółowo, z krótką listą punktów.")
      : p.aiStyle === "friendly"
      ? i18next.t("diet.tone.friendly", "Przyjaźnie i motywująco.")
      : i18next.t("diet.tone.neutral", "Neutralnie i rzeczowo.");
  const focus =
    p.aiFocus === "mealPlanning"
      ? i18next.t(
          "diet.focus.mealPlanning",
          "Skup się na gotowych propozycjach posiłków."
        )
      : p.aiFocus === "analyzingMistakes"
      ? i18next.t(
          "diet.focus.analyzingMistakes",
          "Najpierw wskaż błędy, potem poprawki."
        )
      : p.aiFocus === "quickAnswers"
      ? i18next.t(
          "diet.focus.quickAnswers",
          "Udziel krótkiej odpowiedzi bez dygresji."
        )
      : p.aiFocus === "motivation"
      ? i18next.t(
          "diet.focus.motivation",
          "Dodaj 1–2 zdania wsparcia psychologicznego."
        )
      : i18next.t("diet.focus.default", "Dopasuj odpowiedź do pytania.");
  return { rules, prefers, avoid, tone, focus };
}

function enforceDietConstraints(output: string, banned: string[]): string {
  const hit = banned.find((k) =>
    new RegExp(`\\b${escapeRegex(k)}\\b`, "i").test(output)
  );
  if (!hit) return output;
  return (
    output.replace(
      new RegExp(`\\b${escapeRegex(hit)}\\b`, "ig"),
      i18next.t("diet.replacement", "zamiennik")
    ) +
    "\n\n" +
    i18next.t(
      "diet.constraintsNote",
      "(Uwzględniłem Twoje ograniczenia – zaproponowałem zamienniki.)"
    )
  );
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const rawKey = Constants.expoConfig?.extra?.openaiApiKey;
const apiKey = rawKey?.trim();
const openai = new OpenAI({ apiKey });

function compactProfile(p: FormData) {
  const obj: any = {
    g: p.goal || null,
    act: p.activityLevel || null,
    s: p.sex || null,
    a: p.age || null,
    h: p.unitsSystem === "metric" ? p.height : undefined,
    w: p.weight ?? undefined,
    kcal: typeof p.calorieTarget === "number" ? p.calorieTarget : undefined,
    prefs: Array.isArray(p.preferences) ? p.preferences.slice(0, 5) : [],
    alg: Array.isArray(p.allergies) ? p.allergies.slice(0, 5) : [],
    chr: Array.isArray(p.chronicDiseases) ? p.chronicDiseases.slice(0, 5) : [],
  };
  return JSON.stringify(obj);
}

function formatMealsCompact(meals: Meal[]) {
  if (!meals?.length) return i18next.t("diet.user.noData", "brak danych");
  return meals
    .slice()
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, 5)
    .map((m) => `• ${m.name || m.type || "meal"}`)
    .join("\n");
}

function trimHistory(
  chatHistory: Message[],
  n = 5
): ChatCompletionMessageParam[] {
  return chatHistory.slice(-n).map((m) => ({
    role: m.from === "user" ? "user" : "assistant",
    content: m.text,
  }));
}

const MAX_WORDS = 200;
const MAX_TOKENS = 280;

function safeTrimToSentence(text: string, maxWords = MAX_WORDS): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  const slice = words.slice(0, maxWords + 30).join(" ");
  const m = slice.match(/([\s\S]*?[.!?])(?:\s|$)/g);
  if (m && m.length) {
    let acc = "";
    for (const s of m) {
      if (
        acc.trim().split(/\s+/).length + s.trim().split(/\s+/).length >
        maxWords
      )
        break;
      acc += s.trim() + " ";
    }
    const trimmed = acc.trim();
    if (trimmed) return trimmed + " …";
  }
  return words.slice(0, maxWords).join(" ") + " …";
}

export async function askDietAI(
  question: string,
  meals: Meal[],
  chatHistory: Message[],
  profile: FormData
): Promise<string> {
  const dc = buildDietContext(profile);
  const lang = i18next.language || "en";
  const profileSummary = compactProfile(profile);
  const recentMeals = formatMealsCompact(meals);
  const history = trimHistory(chatHistory, 5);

  const hardLimit = i18next.t(
    "diet.system.lengthLimit",
    "Bezwzględny limit: maksymalnie 200 słów. Nigdy nie przekraczaj limitu. Zakończ odpowiedź pełnym zdaniem. Jeśli zbliżasz się do limitu, streszczaj."
  ) as string;

  const system = [
    i18next.t(
      "diet.system.role",
      "Jesteś licencjonowanym dietetykiem. Odpowiadasz w języku użytkownika."
    ),
    hardLimit,
    i18next.t(
      "diet.system.rulesHeader",
      "Zawsze stosuj poniższe reguły zgodności."
    ),
    ...dc.rules.slice(0, 6).map((r) => `- ${r}`),
    dc.prefers.length
      ? i18next.t("diet.system.prefers", "Preferencje użytkownika: {{list}}.", {
          list: dc.prefers.slice(0, 4).join("; "),
        })
      : "",
    i18next.t(
      "diet.system.substitute",
      "Jeśli coś jest zabronione, zaproponuj adekwatny zamiennik."
    ),
    i18next.t(
      "diet.system.medical",
      "Nie udzielasz porad medycznych; w razie wątpliwości zasugeruj konsultację."
    ),
    i18next.t("diet.system.language", "Respond in {{lang}}.", { lang }),
    dc.tone,
    dc.focus,
  ]
    .filter(Boolean)
    .join("\n");

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: i18next.t(
        "diet.user.profileBlock",
        "User profile (compact JSON):\n{{profile}}\n\nRecent meals (names only):\n{{meals}}",
        { profile: profileSummary, meals: recentMeals }
      ) as string,
    },
    ...history,
    { role: "user", content: question },
  ];

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: MAX_TOKENS,
    temperature: 0.4,
  });

  let text =
    resp.choices[0]?.message?.content?.trim() ||
    i18next.t("diet.errors.empty", "Brak odpowiedzi.");

  text = enforceDietConstraints(text, dc.avoid);
  text = safeTrimToSentence(text, MAX_WORDS);
  return text;
}

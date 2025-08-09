import OpenAI from "openai";
import Constants from "expo-constants";
import i18next from "i18next";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { Meal, FormData } from "@/src/types/index";

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

function buildProfileSummary(p: FormData) {
  const lines: string[] = [];

  if (p.goal) lines.push(`Goal: ${p.goal}`);
  if (p.activityLevel) lines.push(`Activity: ${p.activityLevel}`);
  if (p.sex) lines.push(`Sex: ${p.sex}`);
  if (p.age) lines.push(`Age: ${p.age}`);
  if (p.unitsSystem === "metric") {
    if (p.height)
      lines.push(
        `Height: ${p.height} cm${p.heightInch ? ` (${p.heightInch}")` : ""}`
      );
    if (p.weight) lines.push(`Weight: ${p.weight} kg`);
  } else {
    if (p.height || p.heightInch)
      lines.push(`Height: ${p.height || "-"}'${p.heightInch || "-"}`);
    if (p.weight) lines.push(`Weight: ${p.weight} lbs`);
  }
  if (Array.isArray(p.preferences) && p.preferences.length)
    lines.push(`Diet prefs: ${p.preferences.join(", ")}`);
  if (Array.isArray(p.allergies) && p.allergies.length)
    lines.push(`Allergies: ${p.allergies.join(", ")}`);
  if (Array.isArray(p.chronicDiseases) && p.chronicDiseases.length)
    lines.push(`Chronic: ${p.chronicDiseases.join(", ")}`);
  if (typeof p.calorieTarget === "number")
    lines.push(`Calorie target: ${p.calorieTarget} kcal/day`);
  if (p.aiNote) lines.push(`Notes: ${p.aiNote}`);

  return lines.length
    ? lines.join("\n")
    : i18next.t("diet.user.noProfile", "no profile data");
}

function formatMeals(meals: Meal[]) {
  if (!meals?.length) return i18next.t("diet.user.noData", "brak danych");

  return meals
    .slice()
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, 20)
    .map((m) => {
      const when =
        typeof m.createdAt === "number"
          ? new Date(m.createdAt).toISOString().slice(0, 16).replace("T", " ")
          : m.createdAt;
      const ing = (m.ingredients || [])
        .map((it: any) =>
          [it.name, typeof it.amount === "number" ? `${it.amount}g` : null]
            .filter(Boolean)
            .join(" ")
        )
        .join(", ");
      return `• ${when} — ${m.name || m.type || "meal"}: ${ing}`;
    })
    .join("\n");
}

export async function askDietAI(
  question: string,
  meals: Meal[],
  chatHistory: Message[],
  profile: FormData
): Promise<string> {
  const dc = buildDietContext(profile);
  const lang = i18next.language || "en";

  const profileSummary = buildProfileSummary(profile);
  const recentMeals = formatMeals(meals);

  console.log(recentMeals);

  const system = [
    i18next.t(
      "diet.system.role",
      "Jesteś licencjonowanym dietetykiem. Odpowiadasz w języku użytkownika."
    ),
    i18next.t(
      "diet.system.rulesHeader",
      "Zawsze stosuj poniższe reguły zgodności (nie łam ich)."
    ),
    ...dc.rules.map((r) => `- ${r}`),
    dc.prefers.length
      ? i18next.t("diet.system.prefers", "Preferencje użytkownika: {{list}}.", {
          list: dc.prefers.join("; "),
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

  const history: ChatCompletionMessageParam[] = chatHistory
    .slice(-10)
    .map((m) => ({
      role: m.from === "user" ? "user" : "assistant",
      content: m.text,
    }));

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: i18next.t(
        "diet.user.profileBlock",
        "User profile:\n{{profile}}\n\nRecent meals:\n{{meals}}",
        { profile: profileSummary, meals: recentMeals }
      ) as string,
    },
    ...history,
    { role: "user", content: question },
  ];

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 350,
    temperature: 0.4,
  });

  let text =
    resp.choices[0]?.message?.content?.trim() ||
    i18next.t("diet.errors.empty", "Brak odpowiedzi.");
  text = enforceDietConstraints(text, dc.avoid);
  return text;
}

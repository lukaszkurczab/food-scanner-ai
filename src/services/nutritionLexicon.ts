import * as Localization from "expo-localization";

export type Lexicon = {
  protein: string[];
  fat_total: string[];
  fat_sub: string[];
  carbs_total: string[];
  carbs_sub: string[];
  energy: string[];
  per100: string[];
  serving: string[];
};

const base: Lexicon = {
  protein: [
    "protein",
    "proteina",
    "proteine",
    "proteinas",
    "białko",
    "bialko",
    "eiweiß",
    "eiweiss",
    "proteínas",
  ],
  fat_total: [
    "fat",
    "total fat",
    "tłuszcz",
    "tluszcz",
    "matiere grasse",
    "matieres grasses",
    "fett",
    "grassi",
    "gras",
    "grasas",
    "lipides",
  ],
  fat_sub: [
    "saturated",
    "saturates",
    "kwasy nasycone",
    "acides gras saturés",
    "gesättigte",
    "grasas saturadas",
    "grassi saturi",
    "ácidos grasos saturados",
  ],
  carbs_total: [
    "carbohydrates",
    "carbs",
    "węglowodany",
    "weglowodany",
    "kohlenhydrate",
    "glucides",
    "carboidrati",
    "hidratos",
    "hidratos de carbono",
  ],
  carbs_sub: [
    "sugars",
    "cukry",
    "zucker",
    "sucres",
    "azúcares",
    "zuccheri",
    "sacharidy",
  ],
  energy: [
    "kcal",
    "calories",
    "energy",
    "energia",
    "energie",
    "energi",
    "cal",
    "calorías",
    "calorias",
    "kj",
    "kJ",
  ],
  per100: [
    "per 100",
    "per100",
    "100 g",
    "100g",
    "100 ml",
    "100ml",
    "na 100",
    "pour 100",
    "per 100 g",
    "per 100 ml",
  ],
  serving: [
    "serving",
    "portion",
    "porcja",
    "porcje",
    "porzione",
    "par portion",
    "per portion",
  ],
};

const maps: Record<string, Partial<Lexicon>> = {
  en: require("@/locales/lexicon/en.nutrition.json"),
  pl: require("@/locales/lexicon/pl.nutrition.json"),
};

function uniq(a: string[]) {
  return Array.from(new Set(a.map((s) => s.toLowerCase())));
}
function mergeLex(a: Lexicon, b?: Partial<Lexicon>): Lexicon {
  if (!b) return a;
  return {
    protein: uniq([...(a.protein || []), ...(b.protein || [])]),
    fat_total: uniq([...(a.fat_total || []), ...(b.fat_total || [])]),
    fat_sub: uniq([...(a.fat_sub || []), ...(b.fat_sub || [])]),
    carbs_total: uniq([...(a.carbs_total || []), ...(b.carbs_total || [])]),
    carbs_sub: uniq([...(a.carbs_sub || []), ...(b.carbs_sub || [])]),
    energy: uniq([...(a.energy || []), ...(b.energy || [])]),
    per100: uniq([...(a.per100 || []), ...(b.per100 || [])]),
    serving: uniq([...(a.serving || []), ...(b.serving || [])]),
  };
}

export function getLexicon(): Lexicon {
  let out = { ...base };
  const langs = Localization.getLocales()
    .map((l) => l.languageCode?.toLowerCase())
    .filter(Boolean) as string[];
  for (const lang of langs) {
    const add = maps[lang];
    if (add) out = mergeLex(out, add);
  }
  return out;
}

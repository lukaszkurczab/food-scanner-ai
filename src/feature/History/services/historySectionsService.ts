import type { Meal } from "@/types/meal";
import type { DaySection } from "@/feature/History/types/daySection";
import { getMealDayKey } from "@/services/meals/mealMetadata";

const normalizeText = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const dateFromDayKey = (dayKey: string): Date => {
  const [year, month, day] = dayKey.split("-").map((part) => Number(part));
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? new Date(0) : date;
};

const isSameDay = (left: Date, right: Date): boolean =>
  left.getDate() === right.getDate() &&
  left.getMonth() === right.getMonth() &&
  left.getFullYear() === right.getFullYear();

const toHeaderTitle = (params: {
  date: Date;
  todayLabel: string;
  yesterdayLabel: string;
  locale?: string;
}): string => {
  const { date, todayLabel, yesterdayLabel, locale } = params;
  const today = new Date();
  if (isSameDay(date, today)) return todayLabel;

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return yesterdayLabel;

  return new Intl.DateTimeFormat(locale || undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
};

const mealKcal = (meal: Meal): number =>
  (meal.ingredients || []).reduce(
    (sum, ingredient) => sum + (Number(ingredient?.kcal) || 0),
    0,
  ) ||
  meal.totals?.kcal ||
  0;

const sectionTotalKcal = (data: Meal[]): number =>
  Math.round(data.reduce((acc, meal) => acc + mealKcal(meal), 0));

const mealKey = (meal: Meal): string => String(meal.cloudId || meal.mealId);

const mealOrderValue = (meal: Meal): string =>
  String(meal.timestamp || meal.updatedAt || "");

function findInsertIndexDesc(data: Meal[], targetOrder: string): number {
  let left = 0;
  let right = data.length;

  while (left < right) {
    const mid = (left + right) >> 1;
    const midOrder = mealOrderValue(data[mid]);
    if (midOrder.localeCompare(targetOrder) >= 0) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

function upsertMealByOrder(data: Meal[], meal: Meal): Meal[] {
  const id = mealKey(meal);
  const targetOrder = mealOrderValue(meal);
  const existingIndex = data.findIndex((item) => mealKey(item) === id);

  if (existingIndex >= 0) {
    const existing = data[existingIndex];
    if (mealOrderValue(existing) === targetOrder) {
      const updated = [...data];
      updated[existingIndex] = meal;
      return updated;
    }

    const withoutExisting = [
      ...data.slice(0, existingIndex),
      ...data.slice(existingIndex + 1),
    ];
    const insertIndex = findInsertIndexDesc(withoutExisting, targetOrder);
    return [
      ...withoutExisting.slice(0, insertIndex),
      meal,
      ...withoutExisting.slice(insertIndex),
    ];
  }

  const insertIndex = findInsertIndexDesc(data, targetOrder);
  return [...data.slice(0, insertIndex), meal, ...data.slice(insertIndex)];
}

export function addOrUpdateMealInSections(
  sections: Map<string, DaySection>,
  meal: Meal,
  labels: {
    todayLabel: string;
    yesterdayLabel: string;
    locale?: string;
  },
): void {
  const dateKey = getMealDayKey(meal) ?? "1970-01-01";
  const date = dateFromDayKey(dateKey);
  const title = toHeaderTitle({
    date,
    todayLabel: labels.todayLabel,
    yesterdayLabel: labels.yesterdayLabel,
    locale: labels.locale,
  });
  const currentSection = sections.get(dateKey) ?? {
    title,
    dateKey,
    totalKcal: 0,
    data: [],
  };

  const nextData = upsertMealByOrder(currentSection.data, meal);

  sections.set(dateKey, {
    title,
    dateKey,
    totalKcal: sectionTotalKcal(nextData),
    data: nextData,
  });
}

export function removeMealFromSections(
  sections: Map<string, DaySection>,
  id: string,
): void {
  for (const [dateKey, section] of sections.entries()) {
    const filtered = section.data.filter((meal) => mealKey(meal) !== id);
    if (filtered.length === section.data.length) continue;

    if (filtered.length === 0) {
      sections.delete(dateKey);
      return;
    }

    sections.set(dateKey, {
      ...section,
      data: filtered,
      totalKcal: sectionTotalKcal(filtered),
    });
    return;
  }
}

export function buildSectionsMap(
  meals: Meal[],
  labels: {
    todayLabel: string;
    yesterdayLabel: string;
    locale?: string;
  },
): Map<string, DaySection> {
  const sections = new Map<string, DaySection>();
  for (const meal of meals) addOrUpdateMealInSections(sections, meal, labels);
  return sections;
}

export function filterSectionsByQuery(params: {
  sectionsMap: Map<string, DaySection>;
  query: string;
}): DaySection[] {
  const sortedSections = Array.from(params.sectionsMap.values()).sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey),
  );

  const normalizedQuery = normalizeText(params.query);
  if (!normalizedQuery) return sortedSections;

  const filtered: DaySection[] = [];

  for (const section of sortedSections) {
    const data = section.data.filter((meal) => {
      const title = normalizeText(meal.name || "");
      const ingredients = normalizeText(
        (meal.ingredients || []).map((ingredient) => ingredient?.name || "").join(" "),
      );
      return `${title} ${ingredients}`.trim().includes(normalizedQuery);
    });

    if (!data.length) continue;

    filtered.push({
      ...section,
      data,
      totalKcal: sectionTotalKcal(data),
    });
  }

  return filtered;
}

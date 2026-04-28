import { describe, expect, it } from "@jest/globals";
import { buildHomeHeroModel } from "@/feature/Home/services/homeHeroPresenter";

const t = (key: string, options?: Record<string, unknown>) => {
  if (key === "home:mealCount") {
    return options?.count === 1 ? "1 meal" : `${options?.count ?? 0} meals`;
  }
  if (key === "home:hero.completed.title") return `Goal reached, ${options?.name}`;
  if (key === "home:hero.completed.titleGeneric") return "Goal reached";
  if (key === "home:hero.completed.cta") return "Review your day";
  if (key === "home:hero.completed.support") return "See your full breakdown for today";
  if (key === "home:hero.pastIncomplete.meta") return "You missed a meal log";
  if (key === "home:hero.pastIncomplete.cta") return "Add a missed meal";
  if (key === "home:hero.pastIncomplete.supportCopy") {
    return "You can still fill in what was missing.";
  }
  if (key === "home:hero.greeting.morning") return `Good morning, ${options?.name}`;
  if (key === "home:hero.greetingGeneric.morning") return "Good morning";
  if (key === "home:hero.todayEmpty.cta") return "Log breakfast";
  if (key === "home:hero.todayEmpty.supportCopy") {
    return "Start with your first meal and the rest of today will build from there.";
  }
  if (key === "home:hero.todayInProgress.cta") return "Log next meal";
  return key;
};

const fullDateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const numberFormatter = new Intl.NumberFormat("en");

describe("homeHeroPresenter", () => {
  it("builds the completed hero model without exposing add-meal affordances", () => {
    const hero = buildHomeHeroModel({
      dayState: {
        status: "completed",
        mealCount: 3,
        consumed: { kcal: 2100, protein: 0, carbs: 0, fat: 0 },
        goalCalories: 2000,
        kcalProgress: 1,
        isToday: true,
      },
      selectedDate: new Date("2026-03-18T08:00:00.000Z"),
      displayName: "Anna",
      t,
      numberFormatter,
      fullDateFormatter,
      now: new Date("2026-03-18T08:00:00.000Z"),
    });

    expect(hero).toEqual({
      title: "Goal reached, Anna",
      meta: "2,100 / 2,000 kcal · 3 meals",
      ctaLabel: "Review your day",
      ctaAction: "review_history",
      tone: "success",
      supportText: "See your full breakdown for today",
      showMethodSelector: false,
      progress: null,
      supportCopy: null,
    });
  });

  it("builds the past-empty hero model with backfill copy", () => {
    const hero = buildHomeHeroModel({
      dayState: {
        status: "past_empty",
        mealCount: 0,
        consumed: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        goalCalories: 2000,
        kcalProgress: 0,
        isToday: false,
      },
      selectedDate: new Date("2026-03-17T08:00:00.000Z"),
      displayName: "Anna",
      t,
      numberFormatter,
      fullDateFormatter,
      now: new Date("2026-03-18T08:00:00.000Z"),
    });

    expect(hero.title).toBe("Tuesday, March 17");
    expect(hero.meta).toBe("You missed a meal log");
    expect(hero.ctaLabel).toBe("Add a missed meal");
    expect(hero.ctaAction).toBe("add_meal");
    expect(hero.supportCopy).toBe("You can still fill in what was missing.");
    expect(hero.showMethodSelector).toBe(true);
    expect(hero.progress).toBeNull();
  });

  it("builds the in-progress today hero model with greeting and progress", () => {
    const hero = buildHomeHeroModel({
      dayState: {
        status: "in_progress",
        mealCount: 1,
        consumed: { kcal: 500, protein: 0, carbs: 0, fat: 0 },
        goalCalories: 2000,
        kcalProgress: 0.25,
        isToday: true,
      },
      selectedDate: new Date("2026-03-18T08:00:00.000Z"),
      displayName: "Anna",
      t,
      numberFormatter,
      fullDateFormatter,
      now: new Date("2026-03-18T08:00:00.000Z"),
    });

    expect(hero).toEqual({
      title: "Good morning, Anna",
      meta: "1 meal · 500 / 2,000 kcal",
      ctaLabel: "Log next meal",
      ctaAction: "add_meal",
      tone: "default",
      supportText: null,
      showMethodSelector: true,
      progress: 0.25,
      supportCopy: null,
    });
  });
});

import { describe, expect, it, jest } from "@jest/globals";
import { getNotificationText } from "@/services/notifications/texts";

jest.mock("@/i18n", () => ({
  __esModule: true,
  default: {
    language: "en",
    getFixedT: (_locale: string, _ns: string) =>
      (key: string, params?: Record<string, unknown>) =>
        `${key}${params ? `:${JSON.stringify(params)}` : ""}`,
  },
}));

describe("getNotificationText", () => {
  it("returns meal reminder texts for concise, detailed and default styles", () => {
    const concise = getNotificationText("meal_reminder", "concise", {
      mealKindLabel: "Lunch",
    });
    expect(concise.title).toContain("push.meal_reminder.title_concise");
    expect(concise.body).toContain('"meal":"Lunch"');

    const detailed = getNotificationText("meal_reminder", "detailed");
    expect(detailed.title).toContain("push.meal_reminder.title");
    expect(detailed.body).toContain("push.meal_reminder.body_detailed");

    const fallbackFromNone = getNotificationText("meal_reminder", "none");
    expect(fallbackFromNone.body).toContain("push.meal_reminder.body");
  });

  it("returns calorie goal texts and uses missing kcal fallback", () => {
    const concise = getNotificationText("calorie_goal", "concise", {
      missingKcal: 250,
    });
    expect(concise.title).toContain("push.calorie_goal.title_concise");
    expect(concise.body).toContain('"kcal":250');

    const detailed = getNotificationText("calorie_goal", "detailed");
    expect(detailed.body).toContain('"kcal":0');
  });

  it("returns day fill text variants", () => {
    const concise = getNotificationText("day_fill", "concise");
    expect(concise.title).toContain("push.day_fill.title_concise");

    const detailed = getNotificationText("day_fill", "detailed");
    expect(detailed.body).toContain("push.day_fill.body_detailed");

    const friendly = getNotificationText("day_fill", "friendly");
    expect(friendly.title).toContain("push.day_fill.title");
    expect(friendly.body).toContain("push.day_fill.body");
  });
});

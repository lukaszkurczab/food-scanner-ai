import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";
import { TodaysMealsList } from "@/feature/Home/components/TodaysMealsList";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

jest.mock("@/components/MealSyncBadge", () => ({
  MealSyncBadge: ({
    syncState,
  }: {
    syncState: string;
    lastSyncedAt?: number | null;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, `sync:${syncState}`);
  },
}));

const buildMeal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "u1",
  mealId: "m1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: "lunch",
  name: "Meal A",
  ingredients: [],
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  syncState: "synced",
  source: "manual",
  totals: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  ...overrides,
});

describe("TodaysMealsList", () => {
  it("renders meals, computes kcal and handles actions", () => {
    const onOpenMeal = jest.fn<(meal: Meal) => void>();
    const onAddMeal = jest.fn();
    const mealWithIngredients = buildMeal({
      mealId: "m1",
      name: "Chicken",
      ingredients: [
        { id: "i1", name: "A", amount: 1, kcal: 100, protein: 0, fat: 0, carbs: 0 },
        { id: "i2", name: "B", amount: 1, kcal: 50, protein: 0, fat: 0, carbs: 0 },
      ],
      totals: { kcal: 999, protein: 0, fat: 0, carbs: 0 },
    });
    const mealWithTotals = buildMeal({
      mealId: "m2",
      name: "Omelette",
      ingredients: [],
      totals: { kcal: 320, protein: 0, fat: 0, carbs: 0 },
    });
    const screen = renderWithTheme(
      <TodaysMealsList
        meals={[mealWithIngredients, mealWithTotals]}
        onOpenMeal={onOpenMeal}
        handleAddMeal={onAddMeal}
      />,
    );

    expect(screen.getByText("translated:todaysMeals")).toBeTruthy();
    expect(screen.getByText("Chicken")).toBeTruthy();
    expect(screen.getByText("150 kcal")).toBeTruthy();
    expect(screen.getAllByText("sync:synced")).toHaveLength(2);
    expect(screen.getByText("Omelette")).toBeTruthy();
    expect(screen.getByText("320 kcal")).toBeTruthy();

    fireEvent.press(screen.getByText("Chicken"));
    expect(onOpenMeal).toHaveBeenCalledWith(mealWithIngredients);

    fireEvent.press(screen.getByText("translated:addMeal"));
    expect(onAddMeal).toHaveBeenCalledTimes(1);
  });

  it("uses translated fallback meal name and hides add button without handler", () => {
    const { getByText, queryByText } = renderWithTheme(
      <TodaysMealsList
        meals={[buildMeal({ name: "", totals: { kcal: 123, protein: 0, fat: 0, carbs: 0 } })]}
      />,
    );

    expect(getByText("translated:meal")).toBeTruthy();
    expect(queryByText("translated:addMeal")).toBeNull();
  });
});

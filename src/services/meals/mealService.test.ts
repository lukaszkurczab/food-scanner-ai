import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Meal } from "@/types/meal";
import {
  deleteMealInFirestore,
  getMealsPageFiltered,
  subscribeMeals,
} from "@/services/meals/mealService";

const mockGetMealsPageLocal = jest.fn<(...args: unknown[]) => Promise<Meal[]>>();
const mockGetMealsPageLocalFiltered = jest.fn<
  (...args: unknown[]) => Promise<{ items: Meal[]; nextBefore: string | null }>
>();
const mockFetchMealsPageRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockMarkMealDeletedRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockEmit = jest.fn<(event: string, payload: Record<string, unknown>) => void>();
const mockOn = jest.fn<(...args: unknown[]) => () => void>();

jest.mock("@/services/offline/meals.repo", () => ({
  getMealsPageLocal: (...args: unknown[]) => mockGetMealsPageLocal(...args),
  getMealsPageLocalFiltered: (...args: unknown[]) =>
    mockGetMealsPageLocalFiltered(...args),
}));

jest.mock("@/services/meals/mealsRepository", () => ({
  extractMealTimestampCursor: (cursor: string | null) =>
    typeof cursor === "string" ? cursor.split("|")[0] : null,
  fetchMealsPageRemote: (...args: unknown[]) => mockFetchMealsPageRemote(...args),
  markMealDeletedRemote: (...args: unknown[]) => mockMarkMealDeletedRemote(...args),
}));

jest.mock("@/services/meals/mealService.images", () => ({
  ensureLocalMealPhoto: jest.fn(),
  localPhotoPath: jest.fn(),
}));

jest.mock("@/services/core/events", () => ({
  on: (...args: unknown[]) => mockOn(...args),
  emit: (event: string, payload: Record<string, unknown>) =>
    mockEmit(event, payload),
}));

jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///docs/",
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
}));

const baseMeal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "ignored",
  mealId: "meal-1",
  timestamp: "2026-03-03T12:00:00.000Z",
  type: "lunch",
  name: "Chicken",
  ingredients: [
    {
      id: "i1",
      name: "Chicken",
      amount: 100,
      kcal: 200,
      protein: 30,
      fat: 5,
      carbs: 0,
    },
  ],
  createdAt: "2026-03-03T12:00:00.000Z",
  updatedAt: "2026-03-03T12:00:00.000Z",
  syncState: "synced",
  source: "manual",
  cloudId: "cloud-1",
  totals: { kcal: 200, protein: 30, fat: 5, carbs: 0 },
  ...overrides,
});

const buildClampedWindow = (days: number) => {
  const now = new Date("2026-03-03T12:00:00.000Z");
  const start = new Date(now);
  start.setDate(now.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

describe("services/mealService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-03T12:00:00.000Z"));
    mockGetMealsPageLocal.mockResolvedValue([]);
    mockFetchMealsPageRemote.mockResolvedValue({ items: [], nextCursor: null });
    mockMarkMealDeletedRemote.mockResolvedValue(undefined);
    mockOn.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses local history repo and clamps access window", async () => {
    mockGetMealsPageLocalFiltered.mockResolvedValueOnce({
      items: [baseMeal()],
      nextBefore: "2026-03-02T12:00:00.000Z",
    });

    const result = await getMealsPageFiltered("u1", {
      limit: 20,
      cursor: "2026-03-02T12:00:00.000Z",
      filters: {
        dateRange: {
          start: new Date("2026-01-01T12:00:00.000Z"),
          end: new Date("2026-03-10T12:00:00.000Z"),
        },
      },
      accessWindowDays: 3,
    });

    const expectedWindow = buildClampedWindow(3);

    expect(mockGetMealsPageLocalFiltered).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        limit: 20,
        beforeISO: "2026-03-02T12:00:00.000Z",
        filters: expect.objectContaining({
          dateRange: {
            start: expectedWindow.start,
            end: expectedWindow.end,
          },
        }),
      }),
    );
    expect(mockFetchMealsPageRemote).not.toHaveBeenCalled();
    expect(result).toEqual({
      items: [baseMeal()],
      nextCursor: "2026-03-02T12:00:00.000Z",
    });
  });

  it("uses local history repo for filtered pagination even when online", async () => {
    mockGetMealsPageLocalFiltered.mockResolvedValueOnce({
      items: [baseMeal({ cloudId: "cloud-2" })],
      nextBefore: "2026-03-01T12:00:00.000Z",
    });

    const result = await getMealsPageFiltered("u1", {
      limit: 10,
      cursor: null,
      filters: {
        calories: [100, 500],
      },
      accessWindowDays: 30,
    });

    const expectedWindow = buildClampedWindow(30);

    expect(mockGetMealsPageLocalFiltered).toHaveBeenCalledWith("u1", {
      limit: 10,
      beforeISO: null,
      filters: {
        calories: [100, 500],
        protein: undefined,
        carbs: undefined,
        fat: undefined,
        dateRange: { start: expectedWindow.start, end: expectedWindow.end },
      },
    });
    expect(mockFetchMealsPageRemote).not.toHaveBeenCalled();
    expect(result).toEqual({
      items: [baseMeal({ cloudId: "cloud-2" })],
      nextCursor: "2026-03-01T12:00:00.000Z",
    });
  });

  it("subscribes through local meals cache and event bus", async () => {
    const unsubscribe1 = jest.fn();
    const unsubscribe2 = jest.fn();
    const unsubscribe3 = jest.fn();
    mockOn
      .mockReturnValueOnce(unsubscribe1)
      .mockReturnValueOnce(unsubscribe2)
      .mockReturnValueOnce(unsubscribe3);
    mockGetMealsPageLocal.mockResolvedValueOnce([baseMeal()]);
    const onData = jest.fn();

    const result = subscribeMeals("u1", onData);

    await Promise.resolve();

    expect(mockGetMealsPageLocal).toHaveBeenCalledWith("u1", 50, undefined);
    expect(onData).toHaveBeenCalledWith([baseMeal()]);

    result();

    expect(unsubscribe1).toHaveBeenCalled();
    expect(unsubscribe2).toHaveBeenCalled();
    expect(unsubscribe3).toHaveBeenCalled();
  });

  it("marks meals as deleted through repository helper", async () => {
    await deleteMealInFirestore("u1", "cloud-1");

    expect(mockMarkMealDeletedRemote).toHaveBeenCalledWith(
      "u1",
      "cloud-1",
      "2026-03-03T12:00:00.000Z",
    );
  });
});

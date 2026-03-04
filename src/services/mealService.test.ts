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
  addOrUpdateMeal,
  deleteMealInFirestore,
  getMealsPageFiltered,
  subscribeMeals,
} from "@/services/mealService";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockGetMealsPageLocal = jest.fn<(...args: unknown[]) => Promise<Meal[]>>();
const mockGetMealsPageLocalFiltered = jest.fn<
  (...args: unknown[]) => Promise<{ items: Meal[]; nextBefore: string | null }>
>();
const mockFetchMealsPageRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSaveMealRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockMarkMealDeletedRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockProcessAndUpload = jest.fn<
  (...args: unknown[]) => Promise<{ imageId: string; cloudUrl: string }>
>();
const mockEmit = jest.fn<(event: string, payload: Record<string, unknown>) => void>();
const mockOn = jest.fn<(...args: unknown[]) => () => void>();
const mockUuid = jest.fn<() => string>();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: (...args: []) => mockNetInfoFetch(...args),
  },
}));

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

jest.mock("@/services/offline/meals.repo", () => ({
  getMealsPageLocal: (...args: unknown[]) => mockGetMealsPageLocal(...args),
  getMealsPageLocalFiltered: (...args: unknown[]) =>
    mockGetMealsPageLocalFiltered(...args),
}));

jest.mock("@/services/mealsRepository", () => ({
  extractMealTimestampCursor: (cursor: string | null) =>
    typeof cursor === "string" ? cursor.split("|")[0] : null,
  fetchMealsPageRemote: (...args: unknown[]) => mockFetchMealsPageRemote(...args),
  saveMealRemote: (...args: unknown[]) => mockSaveMealRemote(...args),
  markMealDeletedRemote: (...args: unknown[]) => mockMarkMealDeletedRemote(...args),
}));

jest.mock("@/services/mealService.images", () => ({
  processAndUpload: (...args: unknown[]) => mockProcessAndUpload(...args),
  ensureLocalMealPhoto: jest.fn(),
  localPhotoPath: jest.fn(),
}));

jest.mock("@/services/events", () => ({
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
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockGetMealsPageLocal.mockResolvedValue([]);
    mockFetchMealsPageRemote.mockResolvedValue({ items: [], nextCursor: null });
    mockSaveMealRemote.mockResolvedValue(undefined);
    mockMarkMealDeletedRemote.mockResolvedValue(undefined);
    mockOn.mockReturnValue(jest.fn());
    mockProcessAndUpload.mockResolvedValue({
      imageId: "image-1",
      cloudUrl: "https://cdn/meal.jpg",
    });
    mockUuid.mockImplementation(() => `uuid-${mockUuid.mock.calls.length}`);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses local history repo when offline and clamps access window", async () => {
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false });
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

  it("delegates online history fetch to meals repository with normalized filters", async () => {
    const cursor = { id: "cursor-1" };
    mockFetchMealsPageRemote.mockResolvedValueOnce({
      items: [baseMeal({ cloudId: "cloud-2" })],
      nextCursor: cursor,
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

    expect(mockFetchMealsPageRemote).toHaveBeenCalledWith({
      uid: "u1",
      pageSize: 10,
      cursor: null,
      filters: {
        calories: [100, 500],
        dateRange: {
          start: expectedWindow.start,
          end: expectedWindow.end,
        },
      },
    });
    expect(result).toEqual({
      items: [baseMeal({ cloudId: "cloud-2" })],
      nextCursor: cursor,
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

  it("uploads local meal photos and saves normalized meal remotely", async () => {
    const saved = await addOrUpdateMeal(
      "u1",
      baseMeal({
        userUid: "ignored",
        mealId: undefined,
        cloudId: undefined,
        photoUrl: "file:///meal.jpg",
        ingredients: [
          {
            id: "i1",
            name: "A",
            amount: 100,
            kcal: 100,
            protein: 10,
            fat: 3,
            carbs: 4,
          },
          {
            id: "i2",
            name: "B",
            amount: 100,
            kcal: 50,
            protein: 2,
            fat: 1,
            carbs: 6,
          },
        ],
      }),
      { alsoSaveToMyMeals: true },
    );

    expect(mockProcessAndUpload).toHaveBeenCalledWith("u1", "file:///meal.jpg");
    expect(mockSaveMealRemote).toHaveBeenCalledWith({
      uid: "u1",
      meal: expect.objectContaining({
        userUid: "u1",
        cloudId: "uuid-1",
        mealId: "uuid-2",
        imageId: "image-1",
        photoUrl: "https://cdn/meal.jpg",
        syncState: "pending",
        totals: {
          kcal: 150,
          protein: 12,
          fat: 4,
          carbs: 10,
        },
      }),
      alsoSaveToMyMeals: true,
    });
    expect(mockEmit).toHaveBeenCalledWith(
      "meal:added",
      expect.objectContaining({
        uid: "u1",
      }),
    );
    expect(saved).toEqual(
      expect.objectContaining({
        cloudId: "uuid-1",
        mealId: "uuid-2",
        imageId: "image-1",
        photoUrl: "https://cdn/meal.jpg",
        syncState: "synced",
      }),
    );
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

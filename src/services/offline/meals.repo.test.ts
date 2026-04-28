import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";

const mockRunSync = jest.fn();
const mockGetFirstSync = jest.fn();

jest.mock("@/services/offline/db", () => ({
  getDB: () => ({
    runSync: (...args: unknown[]) => mockRunSync(...args),
    getFirstSync: (...args: unknown[]) => mockGetFirstSync(...args),
  }),
}));

jest.mock("@/services/core/events", () => ({
  emit: jest.fn(),
}));

const baseMeal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-03-18T10:00:00.000Z",
  type: "lunch",
  name: "Chicken bowl",
  ingredients: [],
  createdAt: "2026-03-18T10:00:00.000Z",
  updatedAt: "2026-03-18T10:00:00.000Z",
  syncState: "pending",
  source: "ai",
  cloudId: "cloud-1",
  inputMethod: "photo",
  aiMeta: {
    model: "gpt-5.4-mini",
    runId: "run-1",
    confidence: 0.88,
    warnings: ["partial_totals"],
  },
  dayKey: "2026-03-18",
  totals: {
    kcal: 500,
    protein: 40,
    carbs: 20,
    fat: 10,
  },
  ...overrides,
});

describe("offline meals repo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("serializes inputMethod and aiMeta on upsert", async () => {
    const { upsertMealLocal } =
      jest.requireActual<typeof import("@/services/offline/meals.repo")>(
        "@/services/offline/meals.repo",
      );
    const { emit } = jest.requireMock("@/services/core/events") as {
      emit: jest.Mock;
    };

    await upsertMealLocal(baseMeal());

    const args = mockRunSync.mock.calls[0]?.[1] as unknown[];
    expect(args).toContain("photo");
    expect(args).toContain(
      JSON.stringify({
        model: "gpt-5.4-mini",
        runId: "run-1",
        confidence: 0.88,
        warnings: ["partial_totals"],
      }),
    );
    expect(args).toContain("2026-03-18");
    expect(emit).toHaveBeenCalledWith("meal:local:upserted", {
      uid: "user-1",
      cloudId: "cloud-1",
      mealId: "meal-1",
      dayKey: "2026-03-18",
      ts: "2026-03-18T10:00:00.000Z",
    });
  });

  it("round-trips dayKey, inputMethod, aiMeta, and totals from local persistence", async () => {
    mockGetFirstSync
      .mockReturnValueOnce({
        cloud_id: "cloud-1",
        meal_id: "meal-1",
        user_uid: "user-1",
        timestamp: "2026-03-18T10:00:00.000Z",
        day_key: "2026-03-18",
        type: "lunch",
        name: "Chicken bowl",
        ingredients: "[]",
        photo_url: null,
        image_local: null,
        image_id: null,
        totals_kcal: 500,
        totals_protein: 40,
        totals_carbs: 20,
        totals_fat: 10,
        deleted: 0,
        created_at: "2026-03-18T10:00:00.000Z",
        updated_at: "2026-03-18T10:00:00.000Z",
        last_synced_at: 0,
        sync_state: "pending",
        source: "ai",
        input_method: "text",
        ai_meta: JSON.stringify({
          model: "gpt-5.4",
          runId: "run-2",
          confidence: 0.5,
          warnings: ["low_confidence"],
        }),
        notes: null,
        tags: "[]",
      })
      .mockReturnValueOnce({
        cloud_id: "cloud-legacy",
        meal_id: "meal-legacy",
        user_uid: "user-1",
        timestamp: "2026-03-18T11:00:00.000Z",
        type: "other",
        name: "Legacy meal",
        ingredients: "[]",
        photo_url: null,
        image_local: null,
        image_id: null,
        totals_kcal: 0,
        totals_protein: 0,
        totals_carbs: 0,
        totals_fat: 0,
        deleted: 0,
        created_at: "2026-03-18T11:00:00.000Z",
        updated_at: "2026-03-18T11:00:00.000Z",
        last_synced_at: 0,
        sync_state: "pending",
        source: "manual",
        notes: null,
        tags: "[]",
      });

    const { getMealByCloudIdLocal } =
      jest.requireActual<typeof import("@/services/offline/meals.repo")>(
        "@/services/offline/meals.repo",
      );

    await expect(getMealByCloudIdLocal("user-1", "cloud-1")).resolves.toEqual(
      expect.objectContaining({
        dayKey: "2026-03-18",
        inputMethod: "text",
        aiMeta: {
          model: "gpt-5.4",
          runId: "run-2",
          confidence: 0.5,
          warnings: ["low_confidence"],
        },
        totals: {
          kcal: 500,
          protein: 40,
          carbs: 20,
          fat: 10,
        },
      }),
    );
    await expect(
      getMealByCloudIdLocal("user-1", "cloud-legacy"),
    ).resolves.toEqual(
      expect.objectContaining({
        inputMethod: null,
        aiMeta: null,
        dayKey: null,
      }),
    );
  });

  it("emits user-scoped delete events", async () => {
    const { markDeletedLocal } =
      jest.requireActual<typeof import("@/services/offline/meals.repo")>(
        "@/services/offline/meals.repo",
      );
    const { emit } = jest.requireMock("@/services/core/events") as {
      emit: jest.Mock;
    };

    await markDeletedLocal("user-1", "cloud-1", "2026-03-18T12:00:00.000Z");

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_uid=? AND cloud_id=?"),
      ["2026-03-18T12:00:00.000Z", "user-1", "cloud-1"],
    );
    expect(emit).toHaveBeenCalledWith("meal:local:deleted", {
      uid: "user-1",
      cloudId: "cloud-1",
      ts: "2026-03-18T12:00:00.000Z",
    });
  });
});

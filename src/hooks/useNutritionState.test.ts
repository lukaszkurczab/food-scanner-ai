import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { emit } from "@/services/core/events";
import type { NutritionStateResult } from "@/services/nutritionState/nutritionStateTypes";
import {
  createFallbackNutritionState,
  getCurrentNutritionStateDayKey,
} from "@/services/nutritionState/nutritionStateService";
import { useNutritionState } from "@/hooks/useNutritionState";

const mockGetNutritionState = jest.fn<
  (uid: string | null | undefined, options?: { dayKey?: string | null; force?: boolean }) => Promise<NutritionStateResult>
>();
const mockRefreshNutritionState = jest.fn<
  (uid: string | null | undefined, options?: { dayKey?: string | null }) => Promise<NutritionStateResult>
>();
const mockInvalidateNutritionStateCache = jest.fn<
  (uid: string | null | undefined, options?: { dayKey?: string | null }) => Promise<void>
>();

jest.mock("@/services/nutritionState/nutritionStateService", () => {
  const actual =
    jest.requireActual("@/services/nutritionState/nutritionStateService") as typeof import("@/services/nutritionState/nutritionStateService");
  return {
    ...actual,
    getNutritionState: (
      uid: string | null | undefined,
      options?: { dayKey?: string | null; force?: boolean },
    ) => mockGetNutritionState(uid, options),
    refreshNutritionState: (
      uid: string | null | undefined,
      options?: { dayKey?: string | null },
    ) => mockRefreshNutritionState(uid, options),
    invalidateNutritionStateCache: (
      uid: string | null | undefined,
      options?: { dayKey?: string | null },
    ) => mockInvalidateNutritionStateCache(uid, options),
  };
});

describe("useNutritionState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvalidateNutritionStateCache.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads nutrition state for the requested uid and day", async () => {
    const remoteState = createFallbackNutritionState("2026-03-18");
    remoteState.quality.mealsLogged = 3;

    mockGetNutritionState.mockResolvedValue({
      state: remoteState,
      source: "remote",
      enabled: true,
      isStale: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useNutritionState({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetNutritionState).toHaveBeenCalledWith("user-1", {
      dayKey: "2026-03-18",
    });
    expect(result.current.state.quality.mealsLogged).toBe(3);
    expect(result.current.source).toBe("remote");
    expect(result.current.enabled).toBe(true);
  });

  it("returns a stable fallback when uid is missing and does not call the service", async () => {
    const { result } = renderHook(() => useNutritionState({ uid: null }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetNutritionState).not.toHaveBeenCalled();
    expect(result.current.state.dayKey).toBe(getCurrentNutritionStateDayKey());
    expect(result.current.source).toBe("fallback");
    expect(result.current.isStale).toBe(true);
  });

  it("exposes service fallback state when the endpoint is unavailable", async () => {
    mockGetNutritionState.mockResolvedValue({
      state: createFallbackNutritionState("2026-03-18"),
      source: "fallback",
      enabled: true,
      isStale: true,
      error: new Error("backend down"),
    });

    const { result } = renderHook(() =>
      useNutritionState({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.enabled).toBe(true);
    expect(result.current.source).toBe("fallback");
  });

  it("keeps the UI stable on failure fallback and supports explicit refresh", async () => {
    const fallbackState = createFallbackNutritionState("2026-03-18");
    fallbackState.quality.mealsLogged = 1;
    const refreshedState = createFallbackNutritionState("2026-03-18");
    refreshedState.quality.mealsLogged = 2;

    mockGetNutritionState.mockResolvedValue({
      state: fallbackState,
      source: "storage",
      enabled: true,
      isStale: true,
      error: new Error("backend down"),
    });
    mockRefreshNutritionState.mockResolvedValue({
      state: refreshedState,
      source: "remote",
      enabled: true,
      isStale: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useNutritionState({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.state.quality.mealsLogged).toBe(1);
    expect(result.current.source).toBe("storage");
    expect(result.current.error).toEqual(expect.any(Error));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockRefreshNutritionState).toHaveBeenCalledWith("user-1", {
      dayKey: "2026-03-18",
    });
    await waitFor(() => {
      expect(result.current.state.quality.mealsLogged).toBe(2);
    });
    expect(result.current.source).toBe("remote");
    expect(result.current.isStale).toBe(false);
  });

  it("invalidates and refreshes state after a meal mutation for the same user", async () => {
    const initialState = createFallbackNutritionState("2026-03-18");
    initialState.quality.mealsLogged = 1;
    const refreshedState = createFallbackNutritionState("2026-03-18");
    refreshedState.quality.mealsLogged = 2;

    mockGetNutritionState.mockResolvedValue({
      state: initialState,
      source: "remote",
      enabled: true,
      isStale: false,
      error: null,
    });
    mockRefreshNutritionState.mockResolvedValue({
      state: refreshedState,
      source: "remote",
      enabled: true,
      isStale: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useNutritionState({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      emit("meal:added", { uid: "user-1" });
    });

    await waitFor(() => {
      expect(mockInvalidateNutritionStateCache).toHaveBeenCalledWith("user-1", {
        dayKey: "2026-03-18",
      });
    });
    expect(mockRefreshNutritionState).toHaveBeenCalledWith("user-1", {
      dayKey: "2026-03-18",
    });
    await waitFor(() => {
      expect(result.current.state.quality.mealsLogged).toBe(2);
    });
  });
});

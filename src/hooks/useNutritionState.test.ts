import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
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
  };
});

describe("useNutritionState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("exposes service fallback state when the endpoint is disabled", async () => {
    mockGetNutritionState.mockResolvedValue({
      state: createFallbackNutritionState("2026-03-18"),
      source: "disabled",
      enabled: false,
      isStale: true,
      error: null,
    });

    const { result } = renderHook(() =>
      useNutritionState({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.enabled).toBe(false);
    expect(result.current.source).toBe("disabled");
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
});

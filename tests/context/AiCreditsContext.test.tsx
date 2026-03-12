import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AppState, type AppStateStatus } from "react-native";
import { AiCreditsProvider, useAiCreditsContext } from "@/context/AiCreditsContext";
import type { AiCreditsStatus } from "@/services/ai/contracts";

const mockUseAuthContext = jest.fn<() => { uid: string | null }>(() => ({
  uid: "user-1",
}));
const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockStorageGetItem = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockStorageSetItem = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/services/core/apiClient", () => ({
  get: (...args: unknown[]) => mockGet(...args),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockStorageGetItem(...args),
    setItem: (...args: unknown[]) => mockStorageSetItem(...args),
  },
  getItem: (...args: unknown[]) => mockStorageGetItem(...args),
  setItem: (...args: unknown[]) => mockStorageSetItem(...args),
}));

function buildCredits(overrides: Partial<AiCreditsStatus> = {}): AiCreditsStatus {
  return {
    userId: "user-1",
    tier: "free",
    balance: 100,
    allocation: 100,
    periodStartAt: "2026-03-23T00:00:00Z",
    periodEndAt: "2026-04-23T00:00:00Z",
    costs: { chat: 1, textMeal: 1, photo: 5 },
    renewalAnchorSource: "free_cycle_start",
    revenueCatEntitlementId: null,
    revenueCatExpirationAt: null,
    lastRevenueCatEventId: null,
    ...overrides,
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AiCreditsProvider>{children}</AiCreditsProvider>
);

describe("AiCreditsContext", () => {
  let appStateListener: ((state: AppStateStatus) => void) | null = null;
  const appStateRemove = jest.fn();
  let nowMs = 1_000;

  beforeEach(() => {
    mockUseAuthContext.mockReset().mockReturnValue({ uid: "user-1" });
    mockGet.mockReset().mockResolvedValue(buildCredits());
    mockStorageGetItem.mockReset().mockResolvedValue(null);
    mockStorageSetItem.mockReset().mockResolvedValue(undefined);
    appStateRemove.mockClear();
    appStateListener = null;
    nowMs = 1_000;

    jest.spyOn(Date, "now").mockImplementation(() => nowMs);

    jest.spyOn(AppState, "addEventListener").mockImplementation(
      (_eventType, listener) => {
        appStateListener = listener;
        return { remove: appStateRemove } as never;
      },
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("refreshes credits on mount", async () => {
    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/ai/credits");
      expect(result.current.credits?.balance).toBe(100);
    });
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      "ai_credits:user-1",
      expect.stringContaining("\"balance\":100"),
    );
  });

  it("returns safe defaults without provider", async () => {
    const { result } = renderHook(() => useAiCreditsContext());

    expect(result.current.credits).toBeNull();
    expect(result.current.canAfford("chat")).toBe(false);
    expect(result.current.applyCreditsFromResponse({})).toBeNull();
    await expect(result.current.refreshCredits()).resolves.toBeNull();
  });

  it("refreshes credits on app foreground", async () => {
    mockGet
      .mockResolvedValueOnce(buildCredits({ balance: 100 }))
      .mockResolvedValueOnce(buildCredits({ balance: 77 }));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.credits?.balance).toBe(100);
    });

    act(() => {
      nowMs += 31_000;
      if (!appStateListener) {
        throw new Error("Missing AppState listener");
      }
      appStateListener("active");
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(result.current.credits?.balance).toBe(77);
    });
  });

  it("throttles app foreground refresh when app resumes too quickly", async () => {
    mockGet
      .mockResolvedValueOnce(buildCredits({ balance: 100 }))
      .mockResolvedValueOnce(buildCredits({ balance: 77 }));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.credits?.balance).toBe(100);
    });

    act(() => {
      nowMs += 5_000;
      if (!appStateListener) {
        throw new Error("Missing AppState listener");
      }
      appStateListener("active");
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(result.current.credits?.balance).toBe(100);
    });
  });

  it("does not refresh on non-active app state", async () => {
    mockGet
      .mockResolvedValueOnce(buildCredits({ balance: 100 }))
      .mockResolvedValueOnce(buildCredits({ balance: 77 }));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.credits?.balance).toBe(100);
    });

    act(() => {
      if (!appStateListener) {
        throw new Error("Missing AppState listener");
      }
      appStateListener("background");
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(result.current.credits?.balance).toBe(100);
    });
  });

  it("computes canAfford from shared credits state", async () => {
    mockGet.mockResolvedValue(buildCredits({ balance: 4 }));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.credits?.balance).toBe(4);
    });

    expect(result.current.canAfford("chat")).toBe(true);
    expect(result.current.canAfford("textMeal")).toBe(true);
    expect(result.current.canAfford("photo")).toBe(false);
  });

  it("applies inline credits fields from AI response payload", async () => {
    mockGet.mockResolvedValue(buildCredits({ balance: 90 }));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.credits?.balance).toBe(90);
    });

    act(() => {
      result.current.applyCreditsFromResponse({
        reply: "ok",
        ...buildCredits({ balance: 12, allocation: 100 }),
      });
    });

    await waitFor(() => {
      expect(result.current.credits?.balance).toBe(12);
      expect(result.current.canAfford("photo")).toBe(true);
    });
  });

  it("skips remote refresh when uid is missing", async () => {
    mockUseAuthContext.mockReturnValue({ uid: null });

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.credits).toBeNull();
      expect(result.current.loading).toBe(false);
    });
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.canAfford("chat")).toBe(false);
  });

  it("returns null when refresh fails", async () => {
    mockGet.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const refreshed = await result.current.refreshCredits();
      expect(refreshed).toBeNull();
    });

    expect(result.current.credits).toBeNull();
  });

  it("hydrates credits from local cache before remote refresh", async () => {
    mockStorageGetItem.mockResolvedValueOnce(
      JSON.stringify(buildCredits({ balance: 42 })),
    );
    mockGet.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.credits?.balance).toBe(42);
    });
    expect(mockGet).toHaveBeenCalledWith("/ai/credits");
  });

  it("ignores invalid inline credits payload", async () => {
    mockGet.mockResolvedValue(buildCredits({ balance: 55 }));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.credits?.balance).toBe(55);
    });

    act(() => {
      const applied = result.current.applyCreditsFromResponse({ reply: "ok" });
      expect(applied).toBeNull();
    });

    expect(result.current.credits?.balance).toBe(55);
  });

  it("returns null when /ai/credits payload has no credits fields", async () => {
    mockGet.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.credits).toBeNull();
    expect(mockGet).toHaveBeenCalledWith("/ai/credits");
  });
});

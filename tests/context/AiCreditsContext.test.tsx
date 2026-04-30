import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
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
  beforeEach(() => {
    mockUseAuthContext.mockReset().mockReturnValue({ uid: "user-1" });
    mockGet.mockReset().mockResolvedValue(buildCredits());
    mockStorageGetItem.mockReset().mockResolvedValue(null);
    mockStorageSetItem.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("refreshes credits when requested", async () => {
    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await act(async () => {
      await result.current.refreshCredits();
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/ai/credits");
      expect(result.current.credits?.balance).toBe(100);
    });
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      "ai_credits:user-1",
      expect.stringContaining("\"balance\":100"),
    );
  });

  it("dedupes concurrent credits refreshes for the same uid", async () => {
    let resolveCredits: ((value: unknown) => void) | null = null;
    mockGet.mockReturnValue(
      new Promise((resolve) => {
        resolveCredits = resolve;
      }),
    );

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    let first: Promise<AiCreditsStatus | null>;
    let second: Promise<AiCreditsStatus | null>;
    act(() => {
      first = result.current.refreshCredits();
      second = result.current.refreshCredits();
    });

    expect(first!).toBe(second!);
    expect(mockGet).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolveCredits?.(buildCredits({ balance: 33 }));
      await first!;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.credits?.balance).toBe(33);
    });
  });

  it("does not duplicate credits requests when consumers refresh together", async () => {
    let resolveCredits: ((value: unknown) => void) | null = null;
    mockGet.mockReturnValue(
      new Promise((resolve) => {
        resolveCredits = resolve;
      }),
    );

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    let firstRefresh: Promise<AiCreditsStatus | null>;
    let consumerRefresh: Promise<AiCreditsStatus | null>;
    act(() => {
      firstRefresh = result.current.refreshCredits();
      consumerRefresh = result.current.refreshCredits();
    });

    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCredits?.(buildCredits({ balance: 64 }));
      await firstRefresh!;
      await consumerRefresh!;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.credits?.balance).toBe(64);
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("returns safe defaults without provider", async () => {
    const { result } = renderHook(() => useAiCreditsContext());

    expect(result.current.credits).toBeNull();
    expect(result.current.canAfford("chat")).toBe(false);
    expect(result.current.applyCreditsFromResponse({})).toBeNull();
    await expect(result.current.refreshCredits()).resolves.toBeNull();
  });

  it("computes canAfford from shared credits state", async () => {
    mockGet.mockResolvedValue(buildCredits({ balance: 4 }));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await act(async () => {
      await result.current.refreshCredits();
    });

    expect(result.current.canAfford("chat")).toBe(true);
    expect(result.current.canAfford("textMeal")).toBe(true);
    expect(result.current.canAfford("photo")).toBe(false);
  });

  it("applies inline credits fields from AI response payload", async () => {
    mockGet.mockResolvedValue(buildCredits({ balance: 90 }));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await act(async () => {
      await result.current.refreshCredits();
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
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("ignores invalid inline credits payload", async () => {
    mockGet.mockResolvedValue(buildCredits({ balance: 55 }));

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });

    await act(async () => {
      await result.current.refreshCredits();
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

    await act(async () => {
      await result.current.refreshCredits();
    });

    expect(result.current.credits).toBeNull();
    expect(mockGet).toHaveBeenCalledWith("/ai/credits");
  });

  it("fetches credit transactions history from backend", async () => {
    mockGet
      .mockResolvedValueOnce(buildCredits({ balance: 100 }))
      .mockResolvedValueOnce({
        items: [
          {
            id: "tx-1",
            type: "deduct",
            action: "chat",
            cost: 1,
            balanceBefore: 20,
            balanceAfter: 19,
            tier: "free",
            periodStartAt: "2026-03-23T00:00:00Z",
            periodEndAt: "2026-04-23T00:00:00Z",
            createdAt: "2026-03-24T10:00:00Z",
          },
        ],
      });

    const { result } = renderHook(() => useAiCreditsContext(), { wrapper });
    await act(async () => {
      await result.current.refreshCredits();
    });

    await act(async () => {
      const items = await result.current.refreshCreditTransactions(2);
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe("tx-1");
      expect(items[0]?.action).toBe("chat");
    });

    expect(mockGet).toHaveBeenCalledWith("/ai/credits/transactions?limit=2");
  });
});

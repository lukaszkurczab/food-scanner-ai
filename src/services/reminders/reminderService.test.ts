import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReminderDecision } from "@/services/reminders/reminderTypes";

const mockGet = jest.fn<(path: string, options?: unknown) => Promise<unknown>>();
const mockReadPublicEnv = jest.fn<(name: string) => string | undefined>();
const mockWarn = jest.fn<(...args: unknown[]) => void>();
const mockTrackSmartReminderDecisionFailed = jest.fn<() => Promise<void>>();

jest.mock("@/services/core/apiClient", () => ({
  get: (path: string, options?: unknown) => mockGet(path, options),
}));

jest.mock("@/services/core/publicEnv", () => ({
  readPublicEnv: (name: string) => mockReadPublicEnv(name),
}));

jest.mock("@/utils/debug", () => ({
  debugScope: () => ({
    log: jest.fn(),
    warn: (...args: unknown[]) => mockWarn(...args),
    error: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
    child: () => ({
      log: jest.fn(),
      warn: (...args: unknown[]) => mockWarn(...args),
      error: jest.fn(),
      time: jest.fn(),
      timeEnd: jest.fn(),
      child: jest.fn(),
    }),
  }),
}));

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  trackSmartReminderDecisionFailed: () => mockTrackSmartReminderDecisionFailed(),
}));

describe("reminderService", () => {
  function createHealthyPayload(overrides?: Partial<ReminderDecision>): ReminderDecision {
    return {
      dayKey: "2026-03-18",
      computedAt: "2026-03-18T12:00:00Z",
      decision: "send",
      kind: "log_next_meal",
      reasonCodes: [
        "preferred_window_today",
        "day_partially_logged",
      ],
      scheduledAtUtc: "2026-03-18T18:30:00Z",
      confidence: 0.84,
      validUntil: "2026-03-18T19:30:00Z",
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackSmartReminderDecisionFailed.mockResolvedValue(undefined);
    mockReadPublicEnv.mockImplementation((name: string) => {
      if (name === "EXPO_PUBLIC_ENABLE_SMART_REMINDERS") {
        return "true";
      }
      return undefined;
    });
  });

  it("fetches reminder decision and keeps the backend payload strict", async () => {
    mockGet.mockResolvedValue(createHealthyPayload());

    const service =
      jest.requireActual("@/services/reminders/reminderService") as typeof import("@/services/reminders/reminderService");

    const result = await service.getReminderDecision("user-1", { dayKey: "2026-03-18" });

    expect(mockGet).toHaveBeenCalledWith(
      "/api/v2/users/me/reminders/decision?day=2026-03-18",
      { timeout: 15_000 },
    );
    expect(result.enabled).toBe(true);
    expect(result.source).toBe("remote");
    expect(result.status).toBe("live_success");
    expect(result.decision?.kind).toBe("log_next_meal");
  });

  it("returns a disabled fallback and skips the endpoint when the flag is off", async () => {
    mockReadPublicEnv.mockImplementation((name: string) => {
      if (name === "EXPO_PUBLIC_ENABLE_SMART_REMINDERS") {
        return "false";
      }
      return undefined;
    });

    const service =
      jest.requireActual("@/services/reminders/reminderService") as typeof import("@/services/reminders/reminderService");

    const result = await service.getReminderDecision("user-1", { dayKey: "2026-03-18" });

    expect(result.enabled).toBe(false);
    expect(result.source).toBe("disabled");
    expect(result.status).toBe("disabled");
    expect(result.decision).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("returns a no-user fallback and skips the endpoint when uid is missing", async () => {
    const service =
      jest.requireActual("@/services/reminders/reminderService") as typeof import("@/services/reminders/reminderService");

    const result = await service.getReminderDecision(null, { dayKey: "2026-03-18" });

    expect(result.source).toBe("fallback");
    expect(result.status).toBe("no_user");
    expect(result.decision).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("rejects contract drift as invalid payload instead of normalizing it away", async () => {
    mockGet.mockResolvedValue({
      ...createHealthyPayload(),
      decision: "maybe_later",
    });

    const service =
      jest.requireActual("@/services/reminders/reminderService") as typeof import("@/services/reminders/reminderService");

    const result = await service.getReminderDecision("user-1", { dayKey: "2026-03-18" });

    expect(result.source).toBe("fallback");
    expect(result.status).toBe("invalid_payload");
    expect(result.decision).toBeNull();
    expect(result.error).toEqual(
      expect.objectContaining({ code: "reminder/invalid-contract-payload" }),
    );
    expect(mockTrackSmartReminderDecisionFailed).toHaveBeenCalled();
  });

  it("rejects non-send payloads that illegally carry kind or schedule", async () => {
    mockGet.mockResolvedValue({
      ...createHealthyPayload({
        decision: "suppress",
        kind: null,
        scheduledAtUtc: null,
      }),
      kind: "log_next_meal",
      scheduledAtUtc: "2026-03-18T18:30:00Z",
    });

    const service =
      jest.requireActual("@/services/reminders/reminderService") as typeof import("@/services/reminders/reminderService");

    const result = await service.getReminderDecision("user-1", { dayKey: "2026-03-18" });

    expect(result.source).toBe("fallback");
    expect(result.status).toBe("invalid_payload");
    expect(result.decision).toBeNull();
  });

  it("rejects reason codes that do not match the decision semantics", async () => {
    mockGet.mockResolvedValue({
      ...createHealthyPayload({
        decision: "send",
      }),
      reasonCodes: ["quiet_hours"],
    });

    const service =
      jest.requireActual("@/services/reminders/reminderService") as typeof import("@/services/reminders/reminderService");

    const result = await service.getReminderDecision("user-1", { dayKey: "2026-03-18" });

    expect(result.source).toBe("fallback");
    expect(result.status).toBe("invalid_payload");
    expect(result.decision).toBeNull();
  });

  it("rejects non-canonical UTC timestamps instead of relying on Date.parse", async () => {
    mockGet.mockResolvedValue({
      ...createHealthyPayload(),
      scheduledAtUtc: "2026-03-18T18:30:00+00:00",
    });

    const service =
      jest.requireActual("@/services/reminders/reminderService") as typeof import("@/services/reminders/reminderService");

    const result = await service.getReminderDecision("user-1", { dayKey: "2026-03-18" });

    expect(result.source).toBe("fallback");
    expect(result.status).toBe("invalid_payload");
    expect(result.decision).toBeNull();
  });

  it("surfaces backend failures distinctly when the endpoint is unavailable", async () => {
    mockGet.mockRejectedValue(new Error("backend down"));

    const service =
      jest.requireActual("@/services/reminders/reminderService") as typeof import("@/services/reminders/reminderService");

    const result = await service.getReminderDecision("user-1", { dayKey: "2026-03-18" });

    expect(result.source).toBe("fallback");
    expect(result.status).toBe("service_unavailable");
    expect(result.decision).toBeNull();
    expect(result.error).toEqual(expect.any(Error));
    expect(mockWarn).toHaveBeenCalled();
    expect(mockTrackSmartReminderDecisionFailed).toHaveBeenCalled();
  });
});

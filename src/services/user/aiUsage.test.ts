import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  canUseAiToday,
  canUseAiTodayFor,
  consumeAiUse,
  consumeAiUseFor,
  getAiUsageState,
  getAiUsageStateFor,
} from "@/services/user/aiUsage";
import { doc, getDoc, setDoc } from "@react-native-firebase/firestore";

jest.mock("@react-native-firebase/firestore", () => ({
  doc: jest.fn(() => "DOC_REF"),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock("./common", () => ({
  usersCollection: jest.fn(() => "USERS_COLLECTION"),
  todayLocal: jest.fn(() => "2026-03-10"),
}));

const getDocMock = getDoc as jest.MockedFunction<typeof getDoc>;
const setDocMock = setDoc as jest.MockedFunction<typeof setDoc>;
const docMock = doc as jest.MockedFunction<typeof doc>;

const snapshot = (data: unknown, exists = true) =>
  ({
    exists: () => exists,
    data: () => data,
  }) as never;

describe("aiUsage service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("short-circuits premium checks", async () => {
    await expect(canUseAiToday("u1", true)).resolves.toBe(true);
    await expect(canUseAiTodayFor("u1", true, "camera")).resolves.toBe(true);
    await consumeAiUse("u1", true);
    await consumeAiUseFor("u1", true, "text");
    expect(getDocMock).not.toHaveBeenCalled();
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("reads legacy count format and applies generic limit", async () => {
    getDocMock.mockResolvedValue(
      snapshot({
        aiDailyUsage: {
          date: "2026-03-10",
          count: 1,
        },
      }),
    );

    await expect(canUseAiToday("u1", false, 1)).resolves.toBe(false);
    await expect(canUseAiToday("u1", false, 2)).resolves.toBe(true);
  });

  it("resets usage when date mismatch or missing doc", async () => {
    getDocMock.mockResolvedValueOnce(
      snapshot({
        aiDailyUsage: {
          date: "2026-03-09",
          counts: { generic: 10, camera: 10, text: 10 },
        },
      }),
    );
    getDocMock.mockResolvedValueOnce(snapshot({}, false));

    await expect(getAiUsageState("u1")).resolves.toEqual({
      date: "2026-03-10",
      count: 0,
    });
    await expect(getAiUsageStateFor("u1", "camera")).resolves.toEqual({
      date: "2026-03-10",
      count: 0,
    });
  });

  it("consumes generic and feature usage with clamped limits", async () => {
    getDocMock
      .mockResolvedValueOnce(
        snapshot({
          aiDailyUsage: {
            date: "2026-03-10",
            counts: { generic: 0, camera: 1, text: 0 },
          },
        }),
      )
      .mockResolvedValueOnce(
        snapshot({
          aiDailyUsage: {
            date: "2026-03-10",
            counts: { generic: 1, camera: 1, text: 0 },
          },
        }),
      );

    await consumeAiUse("u1", false, 1);
    await consumeAiUseFor("u1", false, "camera", 2);

    expect(docMock).toHaveBeenCalledWith("USERS_COLLECTION", "u1");
    expect(setDocMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        aiDailyUsage: {
          date: "2026-03-10",
          counts: { generic: 1, camera: 1, text: 0 },
        },
      },
      { merge: true },
    );
    expect(setDocMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        aiDailyUsage: {
          date: "2026-03-10",
          counts: { generic: 1, camera: 2, text: 0 },
        },
      },
      { merge: true },
    );
  });

  it("reads feature-specific state and usage limits", async () => {
    getDocMock.mockResolvedValue(
      snapshot({
        aiDailyUsage: {
          date: "2026-03-10",
          counts: { generic: 1, camera: 2, text: 0 },
        },
      }),
    );

    await expect(canUseAiTodayFor("u1", false, "camera", 2)).resolves.toBe(false);
    await expect(canUseAiTodayFor("u1", false, "text", 1)).resolves.toBe(true);
    await expect(getAiUsageStateFor("u1", "camera")).resolves.toEqual({
      date: "2026-03-10",
      count: 2,
    });
  });

  it("covers default limits and fallback counters when usage payload is sparse", async () => {
    getDocMock
      .mockResolvedValueOnce(snapshot({}))
      .mockResolvedValueOnce(
        snapshot({
          aiDailyUsage: {
            date: "2026-03-10",
            count: 0,
          },
        }),
      )
      .mockResolvedValueOnce(
        snapshot({
          aiDailyUsage: {
            date: "2026-03-10",
            counts: {},
          },
        }),
      )
      .mockResolvedValueOnce(
        snapshot({
          aiDailyUsage: {
            date: "2026-03-10",
            counts: {},
          },
        }),
      );

    await expect(canUseAiToday("u1", false)).resolves.toBe(true);
    await consumeAiUse("u1", false);
    await expect(canUseAiTodayFor("u1", false, "text")).resolves.toBe(true);
    await expect(getAiUsageStateFor("u1", "text")).resolves.toEqual({
      date: "2026-03-10",
      count: 0,
    });

    expect(setDocMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        aiDailyUsage: {
          date: "2026-03-10",
          counts: { generic: 1, camera: 0, text: 0 },
        },
      },
      { merge: true },
    );
  });
});

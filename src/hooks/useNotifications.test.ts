import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { useNotifications } from "@/hooks/useNotifications";
import type { UserNotification } from "@/types/notification";

const mockUuid = jest.fn<() => string>();
const mockSubscribeToUserNotifications = jest.fn<(...args: unknown[]) => () => void>();
const mockUpsertUserNotification = jest.fn<
  (uid: string, id: string, payload: unknown) => Promise<void>
>();
const mockDeleteUserNotification = jest.fn<
  (uid: string, id: string) => Promise<void>
>();
const mockFetchNotificationPrefs = jest.fn<
  (uid: string) => Promise<unknown>
>();
const mockUpdateNotificationPrefs = jest.fn<
  (uid: string, notifications: unknown) => Promise<void>
>();
const mockReconcileAll = jest.fn<(uid: string) => Promise<void>>();
const mockCancelAllForNotif = jest.fn<(key: string) => Promise<void>>();
const mockNotificationScheduleKey = jest.fn<(uid: string, id: string) => string>();
const mockStorageGetItem = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockStorageSetItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUnsub = jest.fn<() => void>();

let mockNotificationsCb: ((items: UserNotification[]) => void) | null = null;

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

jest.mock("@/services/notifications/notificationsRepository", () => ({
  subscribeToUserNotifications: (params: {
    onData: (items: UserNotification[]) => void;
  }) => {
    mockSubscribeToUserNotifications(params);
    mockNotificationsCb = params.onData;
    return mockUnsub;
  },
  upsertUserNotification: (uid: string, id: string, payload: unknown) =>
    mockUpsertUserNotification(uid, id, payload),
  deleteUserNotification: (uid: string, id: string) =>
    mockDeleteUserNotification(uid, id),
  fetchNotificationPrefs: (uid: string) => mockFetchNotificationPrefs(uid),
  updateNotificationPrefs: (uid: string, notifications: unknown) =>
    mockUpdateNotificationPrefs(uid, notifications),
}));

jest.mock("@/services/notifications/engine", () => ({
  reconcileAll: (uid: string) => mockReconcileAll(uid),
}));

jest.mock("@/services/notifications/localScheduler", () => ({
  cancelAllForNotif: (key: string) => mockCancelAllForNotif(key),
  notificationScheduleKey: (uid: string, id: string) =>
    mockNotificationScheduleKey(uid, id),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockStorageGetItem(...args),
    setItem: (...args: unknown[]) => mockStorageSetItem(...args),
  },
}));

const baseNotif = (overrides: Partial<UserNotification> = {}): UserNotification => ({
  id: "n-1",
  type: "day_fill",
  name: "Test",
  text: null,
  time: { hour: 12, minute: 0 },
  days: [1, 2, 3],
  enabled: true,
  createdAt: 1,
  updatedAt: 1,
  mealKind: null,
  kcalByHour: null,
  ...overrides,
});

const emitNotifications = (items: UserNotification[]) => {
  if (!mockNotificationsCb) throw new Error("notifications callback missing");
  mockNotificationsCb(items);
};

describe("useNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUuid.mockReturnValue("uuid-1");
    mockUpsertUserNotification.mockResolvedValue(undefined);
    mockDeleteUserNotification.mockResolvedValue(undefined);
    mockFetchNotificationPrefs.mockResolvedValue({});
    mockUpdateNotificationPrefs.mockResolvedValue(undefined);
    mockReconcileAll.mockResolvedValue(undefined);
    mockCancelAllForNotif.mockResolvedValue(undefined);
    mockNotificationScheduleKey.mockImplementation((uid, id) => `${uid}:${id}`);
    mockStorageGetItem.mockResolvedValue(null);
    mockStorageSetItem.mockResolvedValue(undefined);
    mockNotificationsCb = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns empty state for missing uid", async () => {
    const { result } = renderHook(() => useNotifications(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.items).toEqual([]);
    expect(mockSubscribeToUserNotifications).not.toHaveBeenCalled();
  });

  it("hydrates from cache, processes backend pushes and unsubscribes", async () => {
    const cached = [baseNotif({ id: "cached-1" })];
    const fresh = baseNotif({ id: "fresh-1", name: "Fresh" });
    mockStorageGetItem.mockResolvedValueOnce(JSON.stringify(cached));

    const { result, unmount } = renderHook(() => useNotifications("u1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.items).toEqual(cached);

    await act(async () => {
      emitNotifications([fresh]);
    });
    expect(result.current.items).toEqual([fresh]);
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      "notif:list:u1",
      JSON.stringify([fresh]),
    );

    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });

  it("handles malformed cache while still loading fresh state", async () => {
    mockStorageGetItem.mockResolvedValueOnce("{broken-json");

    const { result } = renderHook(() => useNotifications("u1"));

    await act(async () => {
      emitNotifications([]);
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.items).toEqual([]);
  });

  it("creates, updates, toggles and removes notifications", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1000);
    const { result } = renderHook(() => useNotifications("u1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      emitNotifications([
        baseNotif({ id: "n-upd", enabled: true, updatedAt: 1 }),
        baseNotif({ id: "n-tgl", enabled: false, updatedAt: 1 }),
      ]);
    });

    const id = await result.current.create("u1", {
      type: "day_fill",
      name: "Created",
      text: null,
      time: { hour: 10, minute: 30 },
      days: [1, 3, 5],
      enabled: true,
      mealKind: null,
      kcalByHour: null,
    });

    expect(id).toBe("uuid-1");
    expect(mockUpsertUserNotification).toHaveBeenNthCalledWith(
      1,
      "u1",
      "uuid-1",
      expect.objectContaining({
        id: "uuid-1",
        createdAt: 1000,
        updatedAt: 1000,
      }),
    );
    expect(mockReconcileAll).toHaveBeenNthCalledWith(1, "u1");

    await result.current.update("u1", "n-upd", { enabled: false });
    expect(mockUpsertUserNotification).toHaveBeenNthCalledWith(
      2,
      "u1",
      "n-upd",
      expect.objectContaining({
        enabled: false,
        updatedAt: 1000,
      }),
    );
    expect(mockReconcileAll).toHaveBeenNthCalledWith(2, "u1");

    await result.current.toggle("u1", "n-tgl", true);
    expect(mockUpsertUserNotification).toHaveBeenNthCalledWith(
      3,
      "u1",
      "n-tgl",
      expect.objectContaining({
        enabled: true,
        updatedAt: 1000,
      }),
    );
    expect(mockReconcileAll).toHaveBeenNthCalledWith(3, "u1");

    await result.current.remove("u1", "n-del");
    expect(mockNotificationScheduleKey).toHaveBeenCalledWith("u1", "n-del");
    expect(mockCancelAllForNotif).toHaveBeenCalledWith("u1:n-del");
    expect(mockDeleteUserNotification).toHaveBeenCalledWith("u1", "n-del");
    expect(mockReconcileAll).toHaveBeenNthCalledWith(4, "u1");
    nowSpy.mockRestore();
  });

  it("loads motivation prefs from cloud and caches them", async () => {
    mockFetchNotificationPrefs.mockResolvedValueOnce({
      notifications: { motivationEnabled: true },
    });
    const { result } = renderHook(() => useNotifications("u1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.loadMotivationPrefs("u1")).resolves.toEqual({
      enabled: true,
    });
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      "notif:prefs:u1:motivation",
      JSON.stringify({ enabled: true }),
    );
  });

  it("falls back to cached motivation prefs and then false on malformed cache", async () => {
    mockFetchNotificationPrefs.mockRejectedValue(new Error("network"));
    let motivationReads = 0;
    mockStorageGetItem.mockImplementation(async (...args: unknown[]) => {
      const key = args[0] as string;
      if (key === "notif:list:u1") return null;
      if (key === "notif:prefs:u1:motivation") {
        motivationReads += 1;
        return motivationReads === 1 ? JSON.stringify({ enabled: true }) : "{bad-json";
      }
      return null;
    });

    const { result } = renderHook(() => useNotifications("u1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.loadMotivationPrefs("u1")).resolves.toEqual({
      enabled: true,
    });
    await expect(result.current.loadMotivationPrefs("u1")).resolves.toEqual({
      enabled: false,
    });
  });

  it("loads stats prefs from cloud and falls back to false when cache is missing", async () => {
    mockFetchNotificationPrefs
      .mockResolvedValueOnce({
        notifications: { statsEnabled: true },
      })
      .mockRejectedValueOnce(new Error("network"));
    mockStorageGetItem.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useNotifications("u1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.loadStatsPrefs("u1")).resolves.toEqual({
      enabled: true,
    });
    await expect(result.current.loadStatsPrefs("u1")).resolves.toEqual({
      enabled: false,
    });
  });

  it("persists prefs to cache both on success and firestore failure", async () => {
    mockUpdateNotificationPrefs
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useNotifications("u1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.setMotivationPrefs("u1", true);
    expect(mockUpdateNotificationPrefs).toHaveBeenNthCalledWith(
      1,
      "u1",
      { motivationEnabled: true },
    );

    await result.current.setStatsPrefs("u1", false);
    expect(mockUpdateNotificationPrefs).toHaveBeenNthCalledWith(
      2,
      "u1",
      { statsEnabled: false },
    );
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      "notif:prefs:u1:motivation",
      JSON.stringify({ enabled: true }),
    );
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      "notif:prefs:u1:stats",
      JSON.stringify({ enabled: false }),
    );
  });
});

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
const mockGetApp = jest.fn<() => string>(() => "APP");
const mockGetFirestore = jest.fn<(...args: unknown[]) => string>(() => "DB");
const mockCollection = jest.fn<(...args: unknown[]) => string>(() => "COL_REF");
const mockDoc = jest.fn<(...args: unknown[]) => string>(() => "DOC_REF");
const mockOnSnapshot = jest.fn<(...args: unknown[]) => () => void>();
const mockSetDoc = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDeleteDoc = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockGetDoc = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockStorageGetItem = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockStorageSetItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUnsub = jest.fn<() => void>();

let mockSnapshotCb:
  | ((snap: { docs: Array<{ id: string; data: () => unknown }> }) => void)
  | null = null;

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

jest.mock("@react-native-firebase/app", () => ({
  getApp: () => mockGetApp(),
}));

jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: (...args: unknown[]) => mockGetFirestore(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
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

const emitSnapshot = (docs: Array<{ id: string; data: () => unknown }>) => {
  if (!mockSnapshotCb) throw new Error("snapshot callback missing");
  mockSnapshotCb({ docs });
};

describe("useNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUuid.mockReturnValue("uuid-1");
    mockGetApp.mockReturnValue("APP");
    mockGetFirestore.mockReturnValue("DB");
    mockCollection.mockReturnValue("COL_REF");
    mockDoc.mockReturnValue("DOC_REF");
    mockOnSnapshot.mockImplementation((...args: unknown[]) => {
      mockSnapshotCb = args[1] as (snap: {
        docs: Array<{ id: string; data: () => unknown }>;
      }) => void;
      return mockUnsub;
    });
    mockSetDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });
    mockStorageGetItem.mockResolvedValue(null);
    mockStorageSetItem.mockResolvedValue(undefined);
    mockSnapshotCb = null;
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
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it("hydrates from cache, processes snapshots and unsubscribes", async () => {
    const cached = [baseNotif({ id: "cached-1" })];
    const fresh = baseNotif({ id: "fresh-1", name: "Fresh" });
    mockStorageGetItem.mockResolvedValueOnce(JSON.stringify(cached));

    const { result, unmount } = renderHook(() => useNotifications("u1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.items).toEqual(cached);

    await act(async () => {
      emitSnapshot([
        {
          id: "fresh-1",
          data: () => {
            const { id, ...rest } = fresh;
            return rest;
          },
        },
      ]);
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
      emitSnapshot([]);
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
    expect(mockSetDoc).toHaveBeenNthCalledWith(
      1,
      "DOC_REF",
      expect.objectContaining({
        id: "uuid-1",
        createdAt: 1000,
        updatedAt: 1000,
      }),
      { merge: true },
    );

    await result.current.update("u1", "n-upd", { enabled: false });
    expect(mockSetDoc).toHaveBeenNthCalledWith(
      2,
      "DOC_REF",
      expect.objectContaining({
        enabled: false,
        updatedAt: 1000,
      }),
      { merge: true },
    );

    await result.current.toggle("u1", "n-tgl", true);
    expect(mockSetDoc).toHaveBeenNthCalledWith(
      3,
      "DOC_REF",
      expect.objectContaining({
        enabled: true,
        updatedAt: 1000,
      }),
      { merge: true },
    );

    await result.current.remove("u1", "n-del");
    expect(mockDeleteDoc).toHaveBeenCalledWith("DOC_REF");
    nowSpy.mockRestore();
  });

  it("loads motivation prefs from cloud and caches them", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ notifications: { motivationEnabled: true } }),
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
    mockGetDoc.mockRejectedValue(new Error("network"));
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
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ notifications: { statsEnabled: true } }),
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
    mockSetDoc.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useNotifications("u1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.setMotivationPrefs("u1", true);
    expect(mockSetDoc).toHaveBeenNthCalledWith(
      1,
      "DOC_REF",
      { notifications: { motivationEnabled: true } },
      { merge: true },
    );

    await result.current.setStatsPrefs("u1", false);
    expect(mockSetDoc).toHaveBeenNthCalledWith(
      2,
      "DOC_REF",
      { notifications: { statsEnabled: false } },
      { merge: true },
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

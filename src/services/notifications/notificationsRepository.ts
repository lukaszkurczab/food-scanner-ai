import { get, post } from "@/services/core/apiClient";
import { emit, on } from "@/services/core/events";
import type { UserNotification } from "@/types/notification";

type GlobalPrefsDoc = {
  notifications?: {
    motivationEnabled?: boolean;
    smartRemindersEnabled?: boolean;
    statsEnabled?: boolean;
    weekdays0to6?: number[];
    daysAhead?: number;
    quietHours?: {
      startHour?: number;
      endHour?: number;
    };
  };
};

type NotificationListResponse = {
  items?: UserNotification[];
};

type NotificationUpsertResponse = {
  item?: UserNotification | null;
  updated: boolean;
};

type NotificationPrefsResponse = {
  notifications?: GlobalPrefsDoc["notifications"];
};

const listCache = new Map<string, UserNotification[]>();

function emitNotificationList(uid: string, items: UserNotification[]) {
  listCache.set(uid, items);
  emit("notification:list:changed", { uid, items });
}

function normalizeNotificationList(
  payload: NotificationListResponse | null | undefined,
): UserNotification[] {
  return Array.isArray(payload?.items) ? payload.items : [];
}

function normalizePrefs(
  payload: NotificationPrefsResponse | null | undefined,
): GlobalPrefsDoc {
  return {
    notifications:
      payload?.notifications && typeof payload.notifications === "object"
        ? payload.notifications
        : {},
  };
}

async function fetchUserNotifications(uid: string): Promise<UserNotification[]> {
  void uid;
  const response = await get<NotificationListResponse>(
    "/users/me/notifications",
  );
  const items = normalizeNotificationList(response);
  emitNotificationList(uid, items);
  return items;
}

export function subscribeToUserNotifications(params: {
  uid: string;
  onData: (items: UserNotification[]) => void;
  onError?: (error: unknown) => void;
}): () => void {
  const cached = listCache.get(params.uid);
  if (cached) {
    params.onData(cached);
  } else {
    void fetchUserNotifications(params.uid)
      .then((items) => {
        params.onData(items);
      })
      .catch((error) => {
        params.onError?.(error);
      });
  }

  return on<{ uid?: string; items?: UserNotification[] }>(
    "notification:list:changed",
    (payload) => {
      if (payload?.uid !== params.uid) return;
      params.onData(Array.isArray(payload.items) ? payload.items : []);
    },
  );
}

export async function upsertUserNotification(
  uid: string,
  id: string,
  payload: UserNotification,
): Promise<void> {
  void uid;
  const response = await post<NotificationUpsertResponse>(
    "/users/me/notifications",
    { ...payload, id },
  );
  const item = response.item ?? { ...payload, id };
  const current = listCache.get(uid) ?? [];
  const next = current.some((existing) => existing.id === id)
    ? current.map((existing) => (existing.id === id ? item : existing))
    : [...current, item];
  next.sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return left.createdAt - right.createdAt;
    }
    return left.id.localeCompare(right.id);
  });
  emitNotificationList(uid, next);
}

export async function deleteUserNotification(
  uid: string,
  id: string,
): Promise<void> {
  void uid;
  await post(`/users/me/notifications/${id}/delete`);
  const current = listCache.get(uid) ?? [];
  emitNotificationList(
    uid,
    current.filter((item) => item.id !== id),
  );
}

export async function fetchNotificationPrefs(uid: string): Promise<GlobalPrefsDoc> {
  void uid;
  const response = await get<NotificationPrefsResponse>(
    "/users/me/notifications/preferences",
  );
  return normalizePrefs(response);
}

export async function updateNotificationPrefs(
  uid: string,
  notifications: NonNullable<GlobalPrefsDoc["notifications"]>,
): Promise<void> {
  void uid;
  await post("/users/me/notifications/preferences", {
    notifications,
  });
  emit("notification:prefs:changed", { uid, notifications });
}

export async function createDefaultKeepLoggingNotification(
  uid: string,
): Promise<void> {
  const id = "motivation_keep_logging";
  const now = Date.now();

  await upsertUserNotification(uid, id, {
    id,
    type: "day_fill",
    name: "Keep logging",
    text: null,
    time: { hour: 12, minute: 0 },
    days: [0, 1, 2, 3, 4, 5, 6],
    enabled: true,
    createdAt: now,
    updatedAt: now,
    mealKind: null,
    kcalByHour: null,
  });
}

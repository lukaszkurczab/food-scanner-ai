import { get, post } from "@/services/core/apiClient";

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

type NotificationPrefsResponse = {
  notifications?: GlobalPrefsDoc["notifications"];
};

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
}

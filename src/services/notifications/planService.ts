import type { AIStyle, MealKind, NotificationType } from "@/types/notification";
import { post } from "@/services/apiClient";
import { getDayISOInclusiveRange } from "./dayRange";

export type NotificationPlanItem = {
  id: string;
  type: NotificationType;
  enabled: boolean;
  text: string | null;
  time: { hour: number; minute: number };
  days: number[];
  mealKind: MealKind | null;
  shouldSchedule: boolean;
  missingKcal: number | null;
};

type NotificationPlanResponse = {
  aiStyle: AIStyle;
  plans: NotificationPlanItem[];
};

export async function getNotificationPlan(
  uid: string,
  day: Date = new Date()
): Promise<NotificationPlanResponse> {
  void uid;
  const { startIso, endIso } = getDayISOInclusiveRange(day);
  return post<NotificationPlanResponse>(
    "/users/me/notifications/reconcile-plan",
    {
      startIso,
      endIso,
    }
  );
}

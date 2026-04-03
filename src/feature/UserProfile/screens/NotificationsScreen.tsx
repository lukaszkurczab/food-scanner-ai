import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import { useTheme } from "@/theme/useTheme";
import {
  Button,
  ButtonToggle,
  FormScreenShell,
  InfoBlock,
  Modal,
  SettingsRow,
  SettingsSection,
} from "@/components";
import AppIcon from "@/components/AppIcon";
import { useAuthContext } from "@/context/AuthContext";
import { useNotificationsScreenState } from "@/feature/UserProfile/hooks/useNotificationsScreenState";
import { useReminderDecision } from "@/hooks/useReminderDecision";
import { buildSmartReminderQaRows } from "@/services/reminders/reminderSettings";
import type { UserNotification } from "@/types/notification";

type NotificationsNavigation = StackNavigationProp<
  RootStackParamList,
  "Notifications"
>;

type NotificationsScreenProps = {
  navigation: NotificationsNavigation;
};

const weekdayDisplayOrder = [1, 2, 3, 4, 5, 6, 0];

function formatTimeLabel(
  item: UserNotification,
  locale: string | undefined,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(new Date().setHours(item.time.hour, item.time.minute, 0, 0)));
}

function formatDaysLabel(days: number[], locale: string | undefined): string {
  if (days.length === 7) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });

  return weekdayDisplayOrder
    .filter((day) => days.includes(day))
    .map((day) => {
      const date = new Date(Date.UTC(2020, 0, 5 + day));
      return formatter.format(date);
    })
    .join(", ");
}

function buildReminderSubtitle(
  item: UserNotification,
  locale: string | undefined,
  fallbackTypeLabel: string,
  everyDayLabel: string,
): string {
  const timeLabel = formatTimeLabel(item, locale);
  const dayLabel =
    item.days.length === 7
      ? everyDayLabel
      : formatDaysLabel(item.days, locale);
  return `${fallbackTypeLabel} · ${timeLabel} · ${dayLabel}`;
}

export default function NotificationsScreen({
  navigation,
}: NotificationsScreenProps) {
  const { uid } = useAuthContext();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation("notifications");
  const locale = i18n.language || undefined;
  const smartReminderDecision = useReminderDecision({
    uid,
    fetchEnabled: __DEV__,
  });
  const smartReminderQaRows = useMemo(
    () =>
      buildSmartReminderQaRows({
        status: smartReminderDecision.status,
        source: smartReminderDecision.source,
        enabled: smartReminderDecision.enabled,
        decision: smartReminderDecision.decision,
        error: smartReminderDecision.error,
      }),
    [
      smartReminderDecision.decision,
      smartReminderDecision.enabled,
      smartReminderDecision.error,
      smartReminderDecision.source,
      smartReminderDecision.status,
    ],
  );

  const {
    items,
    loading,
    motivationEnabled,
    smartRemindersEnabled,
    statsEnabled,
    systemAllowed,
    settingsCtaVisible,
    setSettingsCtaVisible,
    openSettings,
    onToggleReminder,
    onToggleSmartReminders,
    onToggleMotivation,
    onToggleStats,
  } = useNotificationsScreenState(uid);

  const mealReminders = useMemo(
    () => items.filter((item) => item.type === "meal_reminder"),
    [items],
  );

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("AppSettings");
  };

  const permissionBlock =
    systemAllowed === false ? (
      <InfoBlock
        title={t("screen.permissionOffTitle", {
          defaultValue: "Notifications are off",
        })}
        body={t("screen.permissionOffBody", {
          defaultValue:
            "Turn on system notifications to receive meal reminders and other notification types on time.",
        })}
        tone="warning"
        icon={<AppIcon name="wifi-off" size={18} color={theme.warning.text} />}
      />
    ) : systemAllowed === true ? (
      <InfoBlock
        title={t("screen.permissionOnTitle", {
          defaultValue: "Notifications are on",
        })}
        body={t("screen.permissionOnBody", {
          defaultValue:
            "Fitaly can deliver reminders and other notifications on this device.",
        })}
        tone="success"
        icon={<AppIcon name="check" size={18} color={theme.success.text} />}
      />
    ) : (
      <InfoBlock
        title={t("screen.permissionCheckingTitle", {
          defaultValue: "Checking notification access",
        })}
        body={t("screen.permissionCheckingBody", {
          defaultValue:
            "Fitaly is still checking whether this device can receive notifications.",
        })}
        tone="neutral"
        icon={<AppIcon name="info" size={18} color={theme.textSecondary} />}
      />
    );

  return (
    <>
      <FormScreenShell
        title={t("screen.title")}
        intro={t("screen.intro", {
          defaultValue:
            "Manage meal reminders, notification access, and the notification preferences available in Fitaly today.",
        })}
        onBack={handleBack}
        actionLabel={t("screen.addReminder", {
          defaultValue: "Create reminder",
        })}
        onActionPress={() => navigation.navigate("NotificationForm", { id: null })}
      >
        <View style={styles.content}>
          {permissionBlock}

          {systemAllowed === false ? (
            <Button
              label={t("permissions.openSettings", {
                defaultValue: "Open Settings",
              })}
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                void openSettings();
              }}
            />
          ) : null}

          <SettingsSection
            title={t("screen.mealRemindersTitle", {
              defaultValue: "Meal reminders",
            })}
            footer={t("screen.mealRemindersFooter", {
              defaultValue:
                "Create reminders for specific meals or use Other when the reminder should stay more general.",
            })}
          >
            {mealReminders.length > 0 ? (
              mealReminders.map((item) => (
                <SettingsRow
                  key={item.id}
                  title={item.name}
                  subtitle={buildReminderSubtitle(
                    item,
                    locale,
                    t(`meals.${item.mealKind ?? "other"}`, {
                      defaultValue: item.mealKind ?? "other",
                    }),
                    t("screen.everyDay", {
                      defaultValue: "Every day",
                    }),
                  )}
                  onPress={() =>
                    navigation.navigate("NotificationForm", { id: item.id })
                  }
                  trailing={
                    <ButtonToggle
                      value={!!item.enabled}
                      onToggle={(enabled) => {
                        void onToggleReminder(item.id, enabled);
                      }}
                    />
                  }
                />
              ))
            ) : (
              <SettingsRow
                title={t("screen.noMealRemindersTitle", {
                  defaultValue: "No meal reminders yet",
                })}
                subtitle={t("screen.noMealRemindersBody", {
                  defaultValue:
                    "Create a reminder to get a recurring prompt at the time and days you choose.",
                })}
              />
            )}
          </SettingsSection>

          <SettingsSection
            title={t("screen.preferenceTitle", {
              defaultValue: "Notification preferences",
            })}
          >
            <SettingsRow
              title={t("screen.smartReminders", {
                defaultValue: "Smart reminders",
              })}
              subtitle={t("screen.smartReminderHint", {
                defaultValue:
                  "Smart reminders can adjust timing to your day, recent logging and quiet hours.",
              })}
              trailing={
                <ButtonToggle
                  value={smartRemindersEnabled}
                  onToggle={(enabled) => {
                    void onToggleSmartReminders(enabled);
                  }}
                />
              }
            />
            <SettingsRow
              title={t("screen.motivation", {
                defaultValue: "Motivation",
              })}
              subtitle={t("screen.motivationSubtitle", {
                defaultValue:
                  "Encouragement nudges that use your existing notification preference path.",
              })}
              trailing={
                <ButtonToggle
                  value={motivationEnabled}
                  onToggle={(enabled) => {
                    void onToggleMotivation(enabled);
                  }}
                />
              }
            />
            <SettingsRow
              title={t("screen.stats", {
                defaultValue: "Stats",
              })}
              subtitle={t("screen.statsSubtitle", {
                defaultValue:
                  "Weekly summary notifications based on the current stored preference.",
              })}
              trailing={
                <ButtonToggle
                  value={statsEnabled}
                  onToggle={(enabled) => {
                    void onToggleStats(enabled);
                  }}
                />
              }
            />
          </SettingsSection>

          {__DEV__ ? (
            <SettingsSection
              title={t("screen.smartReminderDebugTitle", {
                defaultValue: "Smart Reminder QA",
              })}
            >
              {smartReminderQaRows.map((row) => (
                <SettingsRow
                  key={row.label}
                  title={row.label}
                  value={row.value}
                />
              ))}
            </SettingsSection>
          ) : null}

          {loading ? (
            <InfoBlock
              title={t("screen.loadingTitle", {
                defaultValue: "Loading reminders",
              })}
              body={t("screen.loadingBody", {
                defaultValue:
                  "Reminder settings are still loading from your account.",
              })}
              tone="neutral"
            />
          ) : null}
        </View>
      </FormScreenShell>

      <Modal
        visible={settingsCtaVisible}
        title={t("permissions.title", {
          defaultValue: "Enable notifications",
        })}
        message={t("permissions.message", {
          defaultValue:
            "Notifications are disabled. You can enable them in Settings.",
        })}
        onClose={() => setSettingsCtaVisible(false)}
        primaryAction={{
          label: t("permissions.openSettings", {
            defaultValue: "Open Settings",
          }),
          onPress: openSettings,
          testID: "open-settings",
        }}
        secondaryAction={{
          label: t("permissions.notNow", {
            defaultValue: "Not now",
          }),
          onPress: () => setSettingsCtaVisible(false),
          testID: "not-now",
        }}
      />
    </>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.sectionGap,
    },
  });

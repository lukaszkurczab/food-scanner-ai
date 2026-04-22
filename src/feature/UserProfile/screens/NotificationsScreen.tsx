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
        title={t("screen.permissionOffTitle")}
        body={t("screen.permissionOffBody")}
        tone="warning"
        icon={<AppIcon name="wifi-off" size={18} color={theme.warning.text} />}
      />
    ) : systemAllowed === true ? (
      <InfoBlock
        title={t("screen.permissionOnTitle")}
        body={t("screen.permissionOnBody")}
        tone="success"
        icon={<AppIcon name="check" size={18} color={theme.success.text} />}
      />
    ) : (
      <InfoBlock
        title={t("screen.permissionCheckingTitle")}
        body={t("screen.permissionCheckingBody")}
        tone="neutral"
        icon={<AppIcon name="info" size={18} color={theme.textSecondary} />}
      />
    );

  return (
    <>
      <FormScreenShell
        title={t("screen.title")}
        intro={t("screen.intro")}
        onBack={handleBack}
        actionLabel={t("screen.addReminder")}
        onActionPress={() => navigation.navigate("NotificationForm", { id: null })}
      >
        <View style={styles.content}>
          {permissionBlock}

          {systemAllowed === false ? (
            <Button
              label={t("permissions.openSettings")}
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                void openSettings();
              }}
            />
          ) : null}

          <SettingsSection
            title={t("screen.mealRemindersTitle")}
            footer={t("screen.mealRemindersFooter")}
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
                    t("screen.everyDay"),
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
                title={t("screen.noMealRemindersTitle")}
                subtitle={t("screen.noMealRemindersBody")}
              />
            )}
          </SettingsSection>

          <SettingsSection title={t("screen.preferenceTitle")}>
            <SettingsRow
              title={t("screen.smartReminders")}
              subtitle={t("screen.smartReminderHint")}
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
              title={t("screen.motivation")}
              subtitle={t("screen.motivationSubtitle")}
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
              title={t("screen.stats")}
              subtitle={t("screen.statsSubtitle")}
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
            <SettingsSection title={t("screen.smartReminderDebugTitle")}>
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
              title={t("screen.loadingTitle")}
              body={t("screen.loadingBody")}
              tone="neutral"
            />
          ) : null}
        </View>
      </FormScreenShell>

      <Modal
        visible={settingsCtaVisible}
        title={t("permissions.title")}
        message={t("permissions.message")}
        onClose={() => setSettingsCtaVisible(false)}
        primaryAction={{
          label: t("permissions.openSettings"),
          onPress: openSettings,
          testID: "open-settings",
        }}
        secondaryAction={{
          label: t("permissions.notNow"),
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

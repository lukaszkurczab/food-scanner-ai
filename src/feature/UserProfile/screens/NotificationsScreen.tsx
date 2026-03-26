import { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { BackTitleHeader, Button, Layout } from "@/components";
import { useAuthContext } from "@/context/AuthContext";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonToggle } from "@/components/ButtonToggle";
import SectionHeader from "../components/SectionHeader";
import { Alert as AppAlert } from "@/components/Alert";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import { useNotificationsScreenState } from "@/feature/UserProfile/hooks/useNotificationsScreenState";
import { useReminderDecision } from "@/hooks/useReminderDecision";
import { buildSmartReminderQaRows } from "@/services/reminders/reminderSettings";

type NotificationsNavigation = StackNavigationProp<
  RootStackParamList,
  "Notifications"
>;

type NotificationsScreenProps = {
  navigation: NotificationsNavigation;
};

export default function NotificationsScreen({
  navigation,
}: NotificationsScreenProps) {
  const { uid } = useAuthContext();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("notifications");
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
    motivationEnabled,
    smartRemindersEnabled,
    statsEnabled,
    confirmId,
    deleting,
    settingsCtaVisible,
    setSettingsCtaVisible,
    openSettings,
    onToggleReminder,
    onToggleSmartReminders,
    onToggleMotivation,
    onToggleStats,
    askDelete,
    cancelDelete,
    onConfirmDelete,
  } = useNotificationsScreenState(uid);

  return (
    <Layout>
      <ScrollView contentContainerStyle={styles.content}>
        <BackTitleHeader
          title={t("screen.title")}
          onBack={() => navigation.goBack()}
        />

        <View>
          <SectionHeader label={t("screen.myReminders")} />
          <Text style={styles.sectionHint}>
            {t(
              "screen.smartReminderHint",
              "Smart Reminders can adapt timing to your day, recent logging and quiet hours.",
            )}
          </Text>
          {items.map((item) => (
            <View key={item.id} style={styles.mb12}>
              <NotificationCard
                item={item}
                onPress={() =>
                  navigation.navigate("NotificationForm", { id: item.id })
                }
                onToggle={(enabled) => onToggleReminder(item.id, enabled)}
                onRemove={() => askDelete(item.id)}
              />
            </View>
          ))}
        </View>

        <Button
          label={t("screen.addReminder")}
          onPress={() => navigation.navigate("NotificationForm", { id: null })}
          style={styles.addButton}
        />

        <View>
          <SectionHeader label={t("screen.motivation")} />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel} numberOfLines={1}>
              {t("screen.smartReminders")}
            </Text>

            <ButtonToggle
              value={smartRemindersEnabled}
              onToggle={onToggleSmartReminders}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel} numberOfLines={1}>
              {t("screen.motivation")}
            </Text>

            <ButtonToggle
              value={motivationEnabled}
              onToggle={onToggleMotivation}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel} numberOfLines={1}>
              {t("screen.stats")}
            </Text>

            <ButtonToggle
              value={statsEnabled}
              onToggle={onToggleStats}
            />
          </View>
        </View>

        {__DEV__ && (
          <View style={styles.debugSection}>
            <SectionHeader
              label={t("screen.smartReminderDebugTitle", "Smart Reminder QA")}
            />
            {smartReminderQaRows.map((row) => (
              <Text key={row.label} style={styles.debugText}>
                {row.label}: {row.value}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      <AppAlert
        visible={settingsCtaVisible}
        title={t("permissions.title", "Enable notifications")}
        message={t(
          "permissions.message",
          "Notifications are disabled. You can enable them in Settings.",
        )}
        onClose={() => setSettingsCtaVisible(false)}
        primaryAction={{
          label: t("permissions.openSettings", "Open Settings"),
          onPress: openSettings,
          testID: "open-settings",
        }}
        secondaryAction={{
          label: t("permissions.notNow", "Not now"),
          onPress: () => setSettingsCtaVisible(false),
          testID: "not-now",
        }}
      />

      <AppAlert
        visible={!!confirmId}
        title={t("screen.deleteTitle", "Delete reminder")}
        message={t("screen.deleteMsg", "Are you sure?")}
        onClose={cancelDelete}
        primaryAction={{
          label: t("form.delete", "Delete"),
          tone: "destructive",
          loading: deleting,
          onPress: onConfirmDelete,
          testID: "confirm-delete",
        }}
        secondaryAction={{
          label: t("form.cancel", "Cancel"),
          onPress: cancelDelete,
          testID: "cancel-delete",
        }}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    content: { gap: theme.spacing.lg },
    mb12: { marginBottom: theme.spacing.sm },
    addButton: { marginBottom: theme.spacing.md },
    sectionHint: {
      marginBottom: theme.spacing.md,
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.bodyS,
      lineHeight: 20,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    toggleLabel: {
      flex: 1,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.bodyM,
    },
    debugSection: {
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.surfaceElevated,
      gap: theme.spacing.xs,
    },
    debugText: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.bodyS,
    },
  });

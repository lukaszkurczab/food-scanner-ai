import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Layout, PrimaryButton } from "@/components";
import { useAuthContext } from "@/context/AuthContext";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonToggle } from "@/components/ButtonToggle";
import SectionHeader from "../components/SectionHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { Alert as AppAlert } from "@/components/Alert";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import { useNotificationsScreenState } from "@/feature/UserProfile/hooks/useNotificationsScreenState";

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
  const { t } = useTranslation("notifications");

  const {
    items,
    motivationEnabled,
    statsEnabled,
    confirmId,
    deleting,
    settingsCtaVisible,
    setSettingsCtaVisible,
    openSettings,
    onToggleReminder,
    onToggleMotivation,
    onToggleStats,
    askDelete,
    cancelDelete,
    onConfirmDelete,
  } = useNotificationsScreenState(uid);

  return (
    <Layout>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        <Pressable style={styles.header} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color={theme.text} />
          <Text
            style={[styles.heading, { color: theme.text }]}
            accessibilityRole="header"
          >
            {t("screen.title")}
          </Text>
        </Pressable>

        <View>
          <SectionHeader label={t("screen.myReminders")} />
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

        <PrimaryButton
          label={t("screen.addReminder")}
          onPress={() => navigation.navigate("NotificationForm", { id: null })}
          style={{ marginBottom: theme.spacing.md }}
        />

        <View>
          <SectionHeader label={t("screen.motivation")} />

          <View
            style={[
              styles.rowCenter,
              {
                paddingVertical: 16,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <Text
              style={{
                flex: 1,
                color: theme.text,
                fontFamily: theme.typography.fontFamily.bold,
                fontSize: theme.typography.size.md,
              }}
              numberOfLines={1}
            >
              {t("screen.motivation")}
            </Text>

            <ButtonToggle
              value={motivationEnabled}
              onToggle={onToggleMotivation}
              trackColor={
                motivationEnabled ? theme.accentSecondary : theme.textSecondary
              }
            />
          </View>

          <View
            style={[
              styles.rowCenter,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border,
                paddingVertical: 16,
              },
            ]}
          >
            <Text
              style={{
                flex: 1,
                color: theme.text,
                fontFamily: theme.typography.fontFamily.bold,
                fontSize: theme.typography.size.md,
              }}
              numberOfLines={1}
            >
              {t("screen.stats")}
            </Text>

            <ButtonToggle
              value={statsEnabled}
              onToggle={onToggleStats}
              trackColor={
                statsEnabled ? theme.accentSecondary : theme.textSecondary
              }
            />
          </View>
        </View>
      </ScrollView>

      <AppAlert
        visible={settingsCtaVisible}
        title={t("permissions.title", "Enable notifications")}
        message={t(
          "permissions.message",
          "Notifications are disabled. You can enable them in Settings."
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

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 24,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
  },
  mb12: { marginBottom: 12 },
  rowCenter: { flexDirection: "row", alignItems: "center" },
});

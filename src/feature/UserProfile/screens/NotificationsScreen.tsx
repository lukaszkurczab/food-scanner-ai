import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Layout, PrimaryButton } from "@/components";
import { useAuthContext } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonToggle } from "@/components/ButtonToggle";
import { useNavigation } from "@react-navigation/native";
import SectionHeader from "../components/SectionHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { cancelAllForNotif } from "@/services/notifications/localScheduler";
import { Alert as AppAlert } from "@/components/Alert";

export default function NotificationsScreen({ navigation }: any) {
  const { uid } = useAuthContext();
  const theme = useTheme();
  const { t } = useTranslation("notifications");
  const nav = useNavigation<any>();
  const {
    items,
    toggle,
    loadMotivationPrefs,
    setMotivationPrefs,
    setStatsPrefs,
    loadStatsPrefs,
    remove,
  } = useNotifications(uid);
  const [motivationEnabled, setMotivationEnabled] = useState(false);
  const [statsEnabled, setStatsEnabled] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const p = await loadMotivationPrefs(uid);
      const s = await loadStatsPrefs(uid);
      setMotivationEnabled(p.enabled);
      setStatsEnabled(s.enabled);
    })();
  }, [uid, loadMotivationPrefs, loadStatsPrefs]);

  const onConfirmDelete = async () => {
    if (!uid || !confirmId) return;
    setDeleting(true);
    try {
      await cancelAllForNotif(confirmId);
      await remove(uid, confirmId);
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

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
                  nav.navigate("NotificationForm", { id: item.id })
                }
                onToggle={(en) => uid && toggle(uid, item.id, en)}
                onRemove={() => setConfirmId(item.id)}
              />
            </View>
          ))}
        </View>

        <PrimaryButton
          label={t("screen.addReminder")}
          onPress={() => nav.navigate("NotificationForm", { id: null })}
          style={{ marginBottom: theme.spacing.md }}
        />
        <View>
          <SectionHeader label={t("screen.motivation")} />
          <View style={[styles.rowCenter, { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
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
              onToggle={async (v) => {
                setMotivationEnabled(v);
                if (uid) await setMotivationPrefs(uid, v);
              }}
              trackColor={
                motivationEnabled ? theme.accentSecondary : theme.textSecondary
              }
            />
          </View>
          <View style={[styles.rowCenter, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border, paddingVertical: 16 }]}>
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
              onToggle={async (v) => {
                setStatsEnabled(v);
                if (uid) await setStatsPrefs(uid, v);
              }}
              trackColor={
                statsEnabled ? theme.accentSecondary : theme.textSecondary
              }
            />
          </View>
        </View>
      </ScrollView>

      <AppAlert
        visible={!!confirmId}
        title={t("screen.deleteTitle", "Delete reminder")}
        message={t("screen.deleteMsg", "Are you sure?")}
        onClose={() => (!deleting ? setConfirmId(null) : null)}
        primaryAction={{
          label: t("form.delete", "Delete"),
          tone: "destructive",
          loading: deleting,
          onPress: onConfirmDelete,
          testID: "confirm-delete",
        }}
        secondaryAction={{
          label: t("form.cancel", "Cancel"),
          onPress: () => setConfirmId(null),
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

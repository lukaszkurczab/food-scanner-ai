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
  } = useNotifications(uid);
  const [motivationEnabled, setMotivationEnabled] = useState(false);
  const [statsEnabled, setStatsEnabled] = useState(false);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const p = await loadMotivationPrefs(uid);
      const s = await loadStatsPrefs(uid);
      setMotivationEnabled(p.enabled);
      setStatsEnabled(s.enabled);
    })();
  }, [uid, loadMotivationPrefs, loadStatsPrefs]);

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

        <SectionHeader label={t("screen.myReminders")} />

        {items.map((it) => (
          <NotificationCard
            key={it.id}
            item={it}
            onPress={() => nav.navigate("NotificationForm", { id: it.id })}
            onToggle={(en) => uid && toggle(uid, it.id, en)}
          />
        ))}
        <PrimaryButton
          label={t("screen.addReminder")}
          onPress={() => nav.navigate("NotificationForm", { id: null })}
        />
        <SectionHeader label={t("screen.motivation")} />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border,
          }}
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
            Motivation
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border,
            paddingVertical: 16,
          }}
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
            Stats
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
      </ScrollView>
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
});

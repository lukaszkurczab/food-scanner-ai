import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Layout, PrimaryButton } from "@/components";
import { useAuthContext } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { NotificationCard } from "@/components/NotificationCard";
import type { MotivationMode } from "@/types/notification";
import { ButtonToggle } from "@/components/ButtonToggle";
import { useNavigation } from "@react-navigation/native";

export default function NotificationsScreen() {
  const { uid } = useAuthContext();
  const theme = useTheme();
  const { t } = useTranslation("notifications");
  const nav = useNavigation<any>();
  const { items, toggle, loadMotivationPrefs, setMotivationPrefs } =
    useNotifications(uid);
  const [motivationEnabled, setMotivationEnabled] = useState(false);
  const [motivationMode, setMotivationMode] =
    useState<MotivationMode>("minimal");

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const p = await loadMotivationPrefs(uid);
      setMotivationEnabled(p.enabled);
      setMotivationMode(p.mode);
    })();
  }, [uid, loadMotivationPrefs]);

  return (
    <Layout>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        <View>
          <Text
            style={{
              color: theme.text,
              fontFamily: theme.typography.fontFamily.bold,
              fontSize: theme.typography.size.xl,
            }}
          >
            {t("screen.title")}
          </Text>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Text
            style={{
              color: theme.text,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >
            {t("screen.myReminders")}
          </Text>
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
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Text
            style={{
              color: theme.text,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >
            {t("screen.motivation")}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: theme.rounded.md,
              padding: theme.spacing.md,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontFamily: theme.typography.fontFamily.regular,
              }}
            >
              Enabled
            </Text>
            <ButtonToggle
              value={motivationEnabled}
              onToggle={async (v) => {
                setMotivationEnabled(v);
                if (uid) await setMotivationPrefs(uid, v, motivationMode);
              }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={async () => {
                setMotivationMode("minimal");
                if (uid)
                  await setMotivationPrefs(uid, motivationEnabled, "minimal");
              }}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor:
                  motivationMode === "minimal"
                    ? theme.accentSecondary
                    : theme.border,
                backgroundColor:
                  motivationMode === "minimal"
                    ? theme.accentSecondary
                    : theme.card,
                padding: theme.spacing.md,
                borderRadius: theme.rounded.md,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color:
                    motivationMode === "minimal" ? theme.onAccent : theme.text,
                }}
              >
                {t("screen.modeMinimal")}
              </Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                setMotivationMode("full");
                if (uid)
                  await setMotivationPrefs(uid, motivationEnabled, "full");
              }}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor:
                  motivationMode === "full"
                    ? theme.accentSecondary
                    : theme.border,
                backgroundColor:
                  motivationMode === "full"
                    ? theme.accentSecondary
                    : theme.card,
                padding: theme.spacing.md,
                borderRadius: theme.rounded.md,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color:
                    motivationMode === "full" ? theme.onAccent : theme.text,
                }}
              >
                {t("screen.modeFull")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

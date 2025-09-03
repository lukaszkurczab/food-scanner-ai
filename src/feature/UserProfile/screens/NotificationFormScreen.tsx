import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Alert } from "react-native";
import { Layout, PrimaryButton, SecondaryButton } from "@/components";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { WeekdaySelector } from "@/components/WeekdaySelector";
import { TimePickerRow } from "@/components/TimePickerRow";
import { useAuthContext } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationType, UserNotification } from "@/types/notification";
import { useNavigation, useRoute } from "@react-navigation/native";

const TYPES: NotificationType[] = ["meal_reminder", "calorie_goal", "day_fill"];

export default function NotificationFormScreen() {
  const theme = useTheme();
  const { t } = useTranslation("notifications");
  const { uid } = useAuthContext();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const notifId: string | null = route.params?.id ?? null;

  const { items, create, update, remove } = useNotifications(uid);
  const existing = useMemo(
    () => items.find((i) => i.id === notifId) || null,
    [items, notifId]
  );

  const [name, setName] = useState(existing?.name || "");
  const [type, setType] = useState<NotificationType>(
    existing?.type || "meal_reminder"
  );
  const [text, setText] = useState<string>(existing?.text || "");
  const [time, setTime] = useState<{ hour: number; minute: number }>(
    existing?.time || { hour: 20, minute: 0 }
  );
  const [days, setDays] = useState<number[]>(
    existing?.days || [1, 2, 3, 4, 5, 6, 0]
  );
  const [enabled, setEnabled] = useState<boolean>(existing?.enabled ?? true);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setType(existing.type);
      setText(existing.text || "");
      setTime(existing.time);
      setDays(existing.days);
      setEnabled(existing.enabled);
    }
  }, [existing]);

  return (
    <Layout>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.xl,
          }}
        >
          {notifId ? t("form.edit") : t("form.create")}
        </Text>

        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: theme.text,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >
            {t("form.name")}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Breakfast"
            placeholderTextColor={theme.textSecondary}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: theme.rounded.md,
              padding: theme.spacing.md,
              color: theme.text,
            }}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: theme.text,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >
            {t("form.type")}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {TYPES.map((opt) => {
              const active = type === opt;
              return (
                <Text
                  key={opt}
                  onPress={() => setType(opt)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    paddingVertical: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: active ? theme.accentSecondary : theme.border,
                    backgroundColor: active
                      ? theme.accentSecondary
                      : theme.card,
                    color: active ? theme.onAccent : theme.text,
                    borderRadius: theme.rounded.md,
                    fontFamily: theme.typography.fontFamily.medium,
                  }}
                >
                  {t(`type.${opt}`)}
                </Text>
              );
            })}
          </View>
        </View>

        <TimePickerRow
          hour={time.hour}
          minute={time.minute}
          onChange={setTime}
          label={t("form.time")}
        />

        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: theme.text,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >
            {t("form.days")}
          </Text>
          <WeekdaySelector value={days} onChange={setDays} />
        </View>

        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: theme.text,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >
            {t("form.textOverride")}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder=""
            placeholderTextColor={theme.textSecondary}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: theme.rounded.md,
              padding: theme.spacing.md,
              color: theme.text,
            }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <PrimaryButton
            label={t("form.save")}
            onPress={async () => {
              if (!uid) return;
              const payload: Omit<
                UserNotification,
                "id" | "createdAt" | "updatedAt"
              > = {
                type,
                name: name.trim() || "Reminder",
                text: text.trim() || null,
                time,
                days,
                enabled,
              };
              if (notifId) {
                await update(uid, notifId, payload as any);
              } else {
                await create(uid, payload);
              }
              nav.goBack();
            }}
          />
          {notifId ? (
            <SecondaryButton
              label={t("form.delete")}
              onPress={async () => {
                if (!uid) return;
                Alert.alert("Delete", "Are you sure?", [
                  { text: t("form.cancel"), style: "cancel" },
                  {
                    text: t("form.delete"),
                    style: "destructive",
                    onPress: async () => {
                      await remove(uid, notifId);
                      nav.goBack();
                    },
                  },
                ]);
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </Layout>
  );
}

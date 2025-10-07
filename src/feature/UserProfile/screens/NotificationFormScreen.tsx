import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  Layout,
  PrimaryButton,
  SecondaryButton,
  Card,
  Modal,
} from "@/components";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { WeekdaySelector } from "@/components/WeekdaySelector";
import { useAuthContext } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import type {
  NotificationType,
  UserNotification,
  MealKind,
} from "@/types/notification";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { Clock24h, Clock12h } from "@/components";
import { Dropdown } from "@/components/Dropdown";

const TYPES: NotificationType[] = ["meal_reminder", "calorie_goal"];
const MEAL_OPTIONS: Array<{ label: string; value: MealKind | null }> = [
  { label: "Any meal", value: null },
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
];

export default function NotificationFormScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation("notifications");
  const locale = i18n.language || undefined;
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
  const [mealKind, setMealKind] = useState<MealKind | null>(
    (existing as any)?.mealKind ?? null
  );
  const [kcalByHour, setKcalByHour] = useState<number | null>(
    (existing as any)?.kcalByHour ?? null
  );

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setType(existing.type);
      setText(existing.text || "");
      setTime(existing.time);
      setDays(existing.days);
      setEnabled(existing.enabled);
      setMealKind((existing as any)?.mealKind ?? null);
      setKcalByHour((existing as any)?.kcalByHour ?? null);
    }
  }, [existing]);

  const [timeVisible, setTimeVisible] = useState(false);
  const [tmp, setTmp] = useState<Date>(() => {
    const d = new Date();
    d.setHours(time.hour, time.minute, 0, 0);
    return d;
  });

  useEffect(() => {
    const d = new Date();
    d.setHours(time.hour, time.minute, 0, 0);
    setTmp(d);
  }, [time.hour, time.minute]);

  const prefers12h = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        timeZone: "UTC",
      }).formatToParts(new Date(Date.UTC(2020, 0, 1, 13)));
      return parts.some((p) => p.type === "dayPeriod");
    } catch {
      return false;
    }
  }, [locale]);

  const fmtTime = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Layout>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
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
            placeholder={notifId ? t("form.edit") : t("form.create")}
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
          <View style={{ gap: 8 }}>
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

        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: theme.text,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >
            {t("form.time")}
          </Text>
          <Pressable
            onPress={() => {
              const d = new Date();
              d.setHours(time.hour, time.minute, 0, 0);
              setTmp(d);
              setTimeVisible(true);
            }}
          >
            <Card variant="outlined">
              <View style={[styles.rowBetween, { gap: theme.spacing.sm }]}>
                <Text
                  style={{
                    fontSize: theme.typography.size.lg,
                    color: theme.text,
                    fontWeight: "700",
                  }}
                >
                  {fmtTime.format(
                    new Date(new Date().setHours(time.hour, time.minute, 0, 0))
                  )}
                </Text>
                <MaterialIcons name="schedule" size={24} color={theme.link} />
              </View>
            </Card>
          </Pressable>

          <Modal
            visible={timeVisible}
            message={t("form.time")}
            primaryActionLabel={t("form.save")}
            secondaryActionLabel={t("form.cancel")}
            onClose={() => setTimeVisible(false)}
            onSecondaryAction={() => setTimeVisible(false)}
            onPrimaryAction={() => {
              setTime({ hour: tmp.getHours(), minute: tmp.getMinutes() });
              setTimeVisible(false);
            }}
          >
            <View style={{ paddingTop: theme.spacing.sm }}>
              {prefers12h ? (
                <Clock12h
                  value={tmp}
                  onChange={setTmp}
                  onDone={() => {}}
                  onBack={() => {}}
                />
              ) : (
                <Clock24h
                  value={tmp}
                  onChange={setTmp}
                  onDone={() => {}}
                  onBack={() => {}}
                />
              )}
            </View>
          </Modal>
        </View>

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

        {type === "meal_reminder" ? (
          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: theme.text,
                fontFamily: theme.typography.fontFamily.medium,
              }}
            >
              {t("form.mealKind", "Meal kind")}
            </Text>
            <Dropdown
              value={mealKind}
              options={MEAL_OPTIONS}
              onChange={(val) => setMealKind(val)}
            />
          </View>
        ) : null}

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

        <View style={[styles.row, { gap: 12 }]}>
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
                mealKind: type === "meal_reminder" ? mealKind ?? null : null,
                kcalByHour: type === "calorie_goal" ? kcalByHour ?? null : null,
              } as any;
              try {
                await (notifId
                  ? update(uid, notifId, payload as any)
                  : create(uid, payload));
              } catch (error) {
                console.error("Error saving notification:", error);
              }
              if (nav.canGoBack()) nav.goBack();
              else nav.navigate("Notifications");
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

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

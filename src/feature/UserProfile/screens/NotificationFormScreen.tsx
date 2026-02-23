import { useMemo } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
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
import type { MealKind } from "@/types/notification";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { MaterialIcons } from "@expo/vector-icons";
import { Clock24h, Clock12h } from "@/components";
import { Dropdown } from "@/components/Dropdown";
import type { RootStackParamList } from "@/navigation/navigate";
import { useNotificationFormState } from "@/feature/UserProfile/hooks/useNotificationFormState";

type NotificationFormNavigation = StackNavigationProp<
  RootStackParamList,
  "NotificationForm"
>;
type NotificationFormRoute = RouteProp<RootStackParamList, "NotificationForm">;

export default function NotificationFormScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation("notifications");
  const locale = i18n.language || undefined;
  const { uid } = useAuthContext();
  const nav = useNavigation<NotificationFormNavigation>();
  const route = useRoute<NotificationFormRoute>();
  const notifId: string | null = route.params?.id ?? null;

  const mealOptions: Array<{ label: string; value: MealKind | null }> = useMemo(
    () => [
      {
        label: t("mealKind.any", "Any meal"),
        value: null,
      },
      {
        label: t("mealKind.breakfast", "Breakfast"),
        value: "breakfast",
      },
      {
        label: t("mealKind.lunch", "Lunch"),
        value: "lunch",
      },
      {
        label: t("mealKind.dinner", "Dinner"),
        value: "dinner",
      },
      {
        label: t("mealKind.snack", "Snack"),
        value: "snack",
      },
    ],
    [t],
  );

  const {
    types,
    name,
    setName,
    type,
    setType,
    text,
    setText,
    time,
    days,
    setDays,
    mealKind,
    setMealKind,
    timeVisible,
    tmp,
    setTmp,
    prefers12h,
    fmtTime,
    openTimePicker,
    closeTimePicker,
    confirmTime,
    onSave,
    onDelete,
  } = useNotificationFormState({
    uid,
    notifId,
    locale,
    nav,
    labels: {
      defaultName: t("form.defaultName"),
      deleteTitle: t("screen.deleteTitle"),
      deleteMessage: t("screen.deleteMsg"),
      cancel: t("form.cancel"),
      delete: t("form.delete"),
    },
    mealOptions,
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
            {types.map((opt) => {
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
          <Pressable onPress={openTimePicker}>
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
                    new Date(new Date().setHours(time.hour, time.minute, 0, 0)),
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
            onClose={closeTimePicker}
            onSecondaryAction={closeTimePicker}
            onPrimaryAction={confirmTime}
          >
            <View style={{ paddingTop: theme.spacing.sm }}>
              {prefers12h ? (
                <Clock12h value={tmp} onChange={setTmp} />
              ) : (
                <Clock24h value={tmp} onChange={setTmp} />
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
              options={mealOptions}
              onChange={(value) => setMealKind(value)}
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
          <PrimaryButton label={t("form.save")} onPress={onSave} />
          {notifId ? (
            <SecondaryButton label={t("form.delete")} onPress={onDelete} />
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

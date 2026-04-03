import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext";
import { useTheme } from "@/theme/useTheme";
import {
  FormScreenShell,
  LongTextInput,
  Modal,
  SettingsRow,
  SettingsSection,
  TextInput,
} from "@/components";
import { WeekdaySelector } from "@/components/WeekdaySelector";
import { Clock12h, Clock24h } from "@/components";
import { MealKindPickerSheet } from "@/feature/UserProfile/components/MealKindPickerSheet";
import type { MealKind } from "@/types/notification";
import type { RootStackParamList } from "@/navigation/navigate";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNotificationFormState } from "@/feature/UserProfile/hooks/useNotificationFormState";

type NotificationFormNavigation = StackNavigationProp<
  RootStackParamList,
  "NotificationForm"
>;
type NotificationFormRoute = RouteProp<RootStackParamList, "NotificationForm">;

function formatReminderTime(
  hour: number,
  minute: number,
  locale: string | undefined,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(new Date().setHours(hour, minute, 0, 0)));
}

function getWeekdayLabels(locale: string | undefined): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });

  return [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const date = new Date(Date.UTC(2020, 0, 5 + day));
    return formatter
      .format(date)
      .replace(/\./g, "")
      .slice(0, 2)
      .toUpperCase();
  });
}

export default function NotificationFormScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation("notifications");
  const locale = i18n.language || undefined;
  const { uid } = useAuthContext();
  const nav = useNavigation<NotificationFormNavigation>();
  const route = useRoute<NotificationFormRoute>();
  const notifId: string | null = route.params?.id ?? null;
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [mealKindSheetVisible, setMealKindSheetVisible] = useState(false);
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);

  const {
    name,
    setName,
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
      defaultName: t("form.defaultName", {
        defaultValue: "Meal reminder",
      }),
    },
  });

  const handleBack = () => {
    if (nav.canGoBack()) {
      nav.goBack();
      return;
    }

    nav.navigate("Notifications");
  };

  const screenTitle = notifId
    ? t("form.editTitle", {
        defaultValue: "Edit reminder",
      })
    : t("form.createTitle", {
        defaultValue: "Create reminder",
      });

  const selectedMealLabel = t(`meals.${mealKind}`, {
    defaultValue: mealKind,
  });

  return (
    <>
      <FormScreenShell
        title={screenTitle}
        onBack={handleBack}
        actionLabel={t("form.save", { defaultValue: "Save" })}
        onActionPress={() => {
          void onSave();
        }}
        secondaryActionLabel={
          notifId ? t("form.delete", { defaultValue: "Delete" }) : undefined
        }
        secondaryActionPress={
          notifId
            ? () => {
                setDeleteVisible(true);
              }
            : undefined
        }
        secondaryActionTone="destructive"
      >
        <View style={styles.content}>
          <TextInput
            label={t("form.name", { defaultValue: "Name" })}
            value={name}
            onChangeText={setName}
            placeholder={t("form.defaultName", {
              defaultValue: "Meal reminder",
            })}
          />

          <SettingsSection
            title={t("form.scheduleTitle", {
              defaultValue: "Schedule",
            })}
          >
            <SettingsRow
              title={t("form.time", { defaultValue: "Time" })}
              value={formatReminderTime(time.hour, time.minute, locale)}
              onPress={openTimePicker}
            />
            <SettingsRow
              title={t("form.mealFocusTitle", {
                defaultValue: "Applies to",
              })}
              value={selectedMealLabel}
              onPress={() => setMealKindSheetVisible(true)}
              testID="notification-form-meal-kind-row"
            />
          </SettingsSection>

          <View style={styles.daysSection}>
            <Text style={styles.sectionLabel}>
              {t("form.days", { defaultValue: "Days" })}
            </Text>
            <WeekdaySelector
              value={days}
              onChange={setDays}
              labels={weekdayLabels}
            />
          </View>

          <LongTextInput
            label={t("form.textOverrideTitle", {
              defaultValue: "Optional custom message",
            })}
            value={text}
            onChangeText={setText}
            placeholder={t("form.textOverridePlaceholder", {
              defaultValue: "Leave empty to use the standard reminder message.",
            })}
            maxLength={200}
          />
        </View>
      </FormScreenShell>

      <Modal
        visible={timeVisible}
        title={t("form.time", { defaultValue: "Time" })}
        primaryAction={{
          label: t("form.save", { defaultValue: "Save" }),
          onPress: confirmTime,
        }}
        secondaryAction={{
          label: t("form.cancel", { defaultValue: "Cancel" }),
          onPress: closeTimePicker,
        }}
        onClose={closeTimePicker}
      >
        <View style={styles.modalContent}>
          {prefers12h ? (
            <Clock12h value={tmp} onChange={setTmp} />
          ) : (
            <Clock24h value={tmp} onChange={setTmp} />
          )}
        </View>
      </Modal>

      <Modal
        visible={deleteVisible}
        title={t("screen.deleteTitle", {
          defaultValue: "Delete reminder",
        })}
        message={t("screen.deleteMsg", {
          defaultValue: "Are you sure?",
        })}
        onClose={() => setDeleteVisible(false)}
        primaryAction={{
          label: t("form.delete", { defaultValue: "Delete" }),
          tone: "destructive",
          onPress: () => {
            setDeleteVisible(false);
            onDelete();
          },
        }}
        secondaryAction={{
          label: t("form.cancel", { defaultValue: "Cancel" }),
          onPress: () => setDeleteVisible(false),
        }}
      />

      <MealKindPickerSheet
        visible={mealKindSheetVisible}
        currentValue={mealKind}
        onClose={() => setMealKindSheetVisible(false)}
        onSelect={(value: MealKind) => setMealKind(value)}
      />
    </>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.sectionGap,
    },
    daysSection: {
      gap: theme.spacing.sm,
    },
    sectionLabel: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
    },
    modalContent: {
      paddingTop: theme.spacing.sm,
    },
  });

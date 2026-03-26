import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  BackTitleHeader,
  Button,
  Layout,
  Card,
  Modal,
  TextInput,
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
import AppIcon from "@/components/AppIcon";
import { Clock24h, Clock12h } from "@/components";
import { Dropdown } from "@/components/Dropdown";
import type { RootStackParamList } from "@/navigation/navigate";
import { useNotificationFormState } from "@/feature/UserProfile/hooks/useNotificationFormState";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";

type NotificationFormNavigation = StackNavigationProp<
  RootStackParamList,
  "NotificationForm"
>;
type NotificationFormRoute = RouteProp<RootStackParamList, "NotificationForm">;

export default function NotificationFormScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation("notifications");
  const locale = i18n.language || undefined;
  const { uid } = useAuthContext();
  const nav = useNavigation<NotificationFormNavigation>();
  const route = useRoute<NotificationFormRoute>();
  const notifId: string | null = route.params?.id ?? null;
  const screenTitle = notifId ? t("form.edit") : t("form.create");

  const mealOptions: Array<{ label: string; value: MealKind | null }> = useMemo(
    () => [
      {
        label: t("meals.any", "Any meal"),
        value: null,
      },
      {
        label: t("meals.breakfast", "Breakfast"),
        value: "breakfast",
      },
      {
        label: t("meals.lunch", "Lunch"),
        value: "lunch",
      },
      {
        label: t("meals.dinner", "Dinner"),
        value: "dinner",
      },
      {
        label: t("meals.snack", "Snack"),
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
      <ScrollView contentContainerStyle={styles.content}>
        <BackTitleHeader title={screenTitle} onBack={() => nav.goBack()} />

        <View style={styles.section}>
          <Text style={styles.label}>{t("form.name")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={notifId ? t("form.edit") : t("form.create")}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t("form.type")}</Text>
          <View style={styles.section}>
            {types.map((opt) => {
              const active = type === opt;
              return (
                <Text
                  key={opt}
                  onPress={() => setType(opt)}
                  style={[styles.option, active && styles.optionActive]}
                >
                  {t(`type.${opt}`)}
                </Text>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t("form.time")}</Text>
          <Pressable onPress={openTimePicker}>
            <Card variant="outlined">
              <View style={styles.rowBetween}>
                <Text style={styles.timeText}>
                  {fmtTime.format(
                    new Date(new Date().setHours(time.hour, time.minute, 0, 0)),
                  )}
                </Text>
                <AppIcon name="schedule" size={24} color={theme.link} />
              </View>
            </Card>
          </Pressable>

          <Modal
            visible={timeVisible}
            title={t("form.time")}
            primaryAction={{
              label: t("form.save"),
              onPress: confirmTime,
            }}
            secondaryAction={{
              label: t("form.cancel"),
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
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t("form.days")}</Text>
          <WeekdaySelector value={days} onChange={setDays} />
        </View>

        {type === "meal_reminder" ? (
          <View style={styles.section}>
            <Text style={styles.label}>{t("form.mealKind", "Meal kind")}</Text>
            <Dropdown
              value={mealKind}
              options={mealOptions}
              onChange={(value) => setMealKind(value)}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>{t("form.textOverride")}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder=""
            style={styles.input}
          />
        </View>

        {notifId ? (
          <GlobalActionButtons
            label={t("form.save")}
            onPress={onSave}
            secondaryLabel={t("form.delete")}
            secondaryOnPress={onDelete}
            secondaryTone="destructive"
            layout="row"
          />
        ) : (
          <View style={styles.actions}>
            <Button label={t("form.save")} onPress={onSave} />
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    content: { gap: theme.spacing.lg },
    section: { gap: theme.spacing.sm },
    label: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.medium,
    },
    input: {
      marginTop: theme.spacing.xxs,
    },
    option: {
      flex: 1,
      textAlign: "center",
      paddingVertical: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      color: theme.text,
      borderRadius: theme.rounded.md,
      fontFamily: theme.typography.fontFamily.medium,
    },
    optionActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
      color: theme.cta.primaryText,
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    timeText: {
      fontSize: theme.typography.size.title,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
    },
    modalContent: { paddingTop: theme.spacing.sm },
    actions: { gap: theme.spacing.md },
  });

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Card, Modal } from "@/components";
import { MaterialIcons } from "@expo/vector-icons";
import { Clock24h, Clock12h, Calendar } from "@/components";
import { useTranslation } from "react-i18next";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  addedValue?: Date;
  onChangeAdded?: (d: Date) => void;
  minDate?: Date;
  maxDate?: Date;
};

export const DateTimeSection: React.FC<Props> = ({
  value,
  onChange,
  addedValue,
  onChangeAdded,
  minDate,
  maxDate,
}) => {
  const theme = useTheme();
  const { i18n, t } = useTranslation();
  const locale = i18n.language || "en";

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

  const fmtDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale]
  );

  const fmtTime = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: prefers12h,
      }),
    [locale, prefers12h]
  );

  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"date" | "time">("date");
  const [target, setTarget] = useState<"meal" | "added">("meal");
  const [dateText, setDateText] = useState(fmtDate.format(value));
  const [timeText, setTimeText] = useState(fmtTime.format(value));
  const [tmp, setTmp] = useState<Date>(value);

  useEffect(() => {
    setDateText(fmtDate.format(value));
    setTimeText(fmtTime.format(value));
  }, [value, fmtDate, fmtTime]);

  const added = addedValue ?? value;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Pressable
        onPress={() => {
          setTmp(target === "meal" ? value : added);
          setMode("date");
          setVisible(true);
        }}
      >
        <Card variant="outlined">
          <View style={[styles.rowBetween, { gap: theme.spacing.sm }]}>
            <View style={styles.flex1}>
              <Text
                style={{
                  fontSize: theme.typography.size.lg,
                  color: theme.text,
                  fontWeight: "700",
                }}
              >
                {dateText}
              </Text>
              <Text
                style={{
                  fontSize: theme.typography.size.sm,
                  color: theme.textSecondary,
                }}
              >
                {timeText}
              </Text>
            </View>
            <MaterialIcons name="calendar-month" size={24} color={theme.link} />
          </View>
        </Card>
      </Pressable>

      <Modal
        visible={visible}
        message={
          (target === "meal"
            ? t("meals:meal_time", "Czas posiłku")
            : t("meals:added_time", "Czas dodania")) +
          (mode === "date"
            ? " — " + t("meals:pick_date", "wybierz datę")
            : " — " + t("meals:pick_time", "wybierz godzinę"))
        }
        primaryActionLabel={
          mode === "date"
            ? t("common:next", "Dalej")
            : t("common:save", "Zapisz")
        }
        secondaryActionLabel={
          mode === "date"
            ? t("common:cancel", "Anuluj")
            : t("common:back", "Wstecz")
        }
        onClose={() => setVisible(false)}
        onSecondaryAction={() => {
          if (mode !== "date") setMode("date");
          else setVisible(false);
        }}
        onPrimaryAction={() => {
          if (mode === "date") {
            setMode("time");
          } else {
            if (target === "meal") onChange(tmp);
            else onChangeAdded?.(tmp);
            setVisible(false);
          }
        }}
      >
        <View style={{ paddingTop: theme.spacing.sm, gap: theme.spacing.sm }}>
          {mode === "date" ? (
            <Calendar
              startDate={tmp}
              endDate={tmp}
              focus="start"
              onChangeRange={({ start }) => setTmp(start)}
              onToggleFocus={() => {}}
              minDate={minDate}
              maxDate={maxDate}
              mode="single"
              onPickSingle={(d) => setTmp(d)}
            />
          ) : prefers12h ? (
            <Clock12h
              value={tmp}
              onChange={setTmp}
              onDone={() => {}}
              onBack={() => setMode("date")}
            />
          ) : (
            <Clock24h
              value={tmp}
              onChange={setTmp}
              onDone={() => {}}
              onBack={() => setMode("date")}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flex1: { flex: 1 },
});

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
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
  const [tmp, setTmp] = useState<Date>(value);
  const [dateText, setDateText] = useState(fmtDate.format(value));
  const [timeText, setTimeText] = useState(fmtTime.format(value));

  useEffect(() => {
    setTmp(value);
    setDateText(fmtDate.format(value));
    setTimeText(fmtTime.format(value));
  }, [value, fmtDate, fmtTime]);

  const handleOpen = () => {
    setTmp(value);
    setVisible(true);
  };

  const handleSave = () => {
    onChange(tmp);
    setVisible(false);
  };

  const handleCancel = () => {
    setTmp(value);
    setVisible(false);
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Pressable onPress={handleOpen}>
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
          t("meals:meal_time", "Czas posiłku") +
          " — " +
          t("meals:pick_date_time", "Wybierz datę i godzinę")
        }
        primaryActionLabel={t("common:save", "Zapisz")}
        secondaryActionLabel={t("common:cancel", "Anuluj")}
        onClose={handleCancel}
        onSecondaryAction={handleCancel}
        onPrimaryAction={handleSave}
      >
        <View style={{ paddingTop: theme.spacing.sm, gap: theme.spacing.md }}>
          {prefers12h ? (
            <Clock12h value={tmp} onChange={setTmp} />
          ) : (
            <Clock24h value={tmp} onChange={setTmp} />
          )}
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

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Card, Modal } from "@/components";
import { MaterialIcons } from "@expo/vector-icons";
import { Clock24h, Clock12h, Calendar } from "@/components";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  addedValue?: Date;
  onChangeAdded?: (d: Date) => void;
  minDate?: Date;
  maxDate?: Date;
};

const fmtDate = new Intl.DateTimeFormat(i18n.language || "en", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const fmtTime = new Intl.DateTimeFormat(i18n.language || "en", {
  hour: "2-digit",
  minute: "2-digit",
});

export const DateTimeSection: React.FC<Props> = ({
  value,
  onChange,
  addedValue,
  onChangeAdded,
  minDate,
  maxDate,
}) => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const locale = i18n.language || undefined;

  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"date" | "time">("date");
  const [target, setTarget] = useState<"meal" | "added">("meal");
  const [dateText, setDateText] = useState(fmtDate.format(value));
  const [timeText, setTimeText] = useState(fmtTime.format(value));
  const [tmp, setTmp] = useState<Date>(value);

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

  useEffect(() => {
    setDateText(fmtDate.format(value));
    setTimeText(fmtTime.format(value));
  }, [value]);

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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
            }}
          >
            <View style={{ flex: 1 }}>
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
          (target === "meal" ? "Czas posiłku" : "Czas dodania") +
          (mode === "date" ? " — wybierz datę" : " — wybierz godzinę")
        }
        primaryActionLabel={mode === "date" ? "Dalej" : "Zapisz"}
        secondaryActionLabel={mode === "date" ? "Anuluj" : "Wstecz"}
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

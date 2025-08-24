import React, { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Card, Modal } from "@/components";
import { MaterialIcons } from "@expo/vector-icons";
import { Calendar } from "@/components/Calendar";
import { Clock } from "@/components/Clock";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  minDate?: Date;
  maxDate?: Date;
};

export const DateTimeSection: React.FC<Props> = ({
  value,
  onChange,
  minDate,
  maxDate,
}) => {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"date" | "time">("date");
  const [tmp, setTmp] = useState<Date>(value);

  const dateText = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "2-digit",
      }).format(value),
    [value]
  );
  const timeText = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(value),
    [value]
  );

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Pressable
        onPress={() => {
          setTmp(value);
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
            }}
          >
            <View>
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
        message={mode === "date" ? "Wybierz datę" : "Wybierz godzinę"}
        primaryActionLabel={mode === "date" ? "Dalej" : "Zapisz"}
        secondaryActionLabel="Anuluj"
        onClose={() => setVisible(false)}
        onSecondaryAction={() => setVisible(false)}
        onPrimaryAction={() => {
          if (mode === "date") {
            setMode("time");
          } else {
            onChange(tmp);
            setVisible(false);
          }
        }}
      >
        <View style={{ paddingTop: theme.spacing.sm }}>
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
          ) : (
            <Clock
              value={tmp}
              onChange={setTmp}
              onBack={() => setMode("date")}
              onDone={() => {
                onChange(tmp);
                setVisible(false);
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

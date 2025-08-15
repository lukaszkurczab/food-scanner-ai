import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Calendar } from "./Calendar";

type Range = { start: Date; end: Date };

export const DateRangePicker: React.FC<{
  startDate: Date;
  endDate: Date;
  onChange: (range: Range) => void;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
}> = ({ startDate, endDate, onChange, minDate, maxDate, locale }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<"start" | "end">("start");
  const [local, setLocal] = useState<Range>({ start: startDate, end: endDate });

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
      }),
    [locale]
  );

  const summary = `${fmt.format(local.start)}-${fmt.format(local.end)}`;

  const openModal = () => {
    setLocal({ start: startDate, end: endDate });
    setFocus("start");
    setOpen(true);
  };

  const apply = () => {
    const s = +local.start <= +local.end ? local.start : local.end;
    const e = +local.start <= +local.end ? local.end : local.start;
    onChange({ start: s, end: e });
    setOpen(false);
  };

  const cancel = () => {
    setLocal({ start: startDate, end: endDate });
    setFocus("start");
    setOpen(false);
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.text, fontWeight: "700" }}>Date range</Text>
        <Text style={{ color: theme.text }}>{summary}</Text>
      </View>

      <Pressable
        onPress={openModal}
        style={{
          paddingVertical: 12,
          borderRadius: theme.rounded.md,
          borderWidth: 1,
          borderColor: theme.accentSecondary,
          alignItems: "center",
        }}
        accessibilityRole="button"
        accessibilityLabel="Ustaw zakres dat"
      >
        <Text style={{ color: theme.link, fontWeight: "600" }}>
          Set date range
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={cancel}
      >
        <Pressable
          onPress={cancel}
          style={{
            flex: 1,
            backgroundColor: theme.shadow,
            justifyContent: "center",
            alignItems: "center",
            padding: theme.spacing.md,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: "100%",
              maxWidth: 560,
              borderRadius: theme.rounded.lg,
              backgroundColor: theme.card,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.border,
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
              gap: theme.spacing.md,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontWeight: "700",
                  fontSize: theme.typography.size.md,
                }}
              >
                Select date range
              </Text>
            </View>

            <Calendar
              startDate={local.start}
              endDate={local.end}
              focus={focus}
              onChangeRange={(r) => setLocal(r)}
              onToggleFocus={() =>
                setFocus((f) => (f === "start" ? "end" : "start"))
              }
              minDate={minDate}
              maxDate={maxDate}
              locale={locale}
            />

            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              <Pressable
                onPress={apply}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: theme.rounded.md,
                  backgroundColor: theme.accentSecondary,
                  alignItems: "center",
                }}
                accessibilityRole="button"
                accessibilityLabel="Zapisz zakres dat"
              >
                <Text style={{ color: theme.onAccent, fontWeight: "700" }}>
                  Save
                </Text>
              </Pressable>

              <Pressable
                onPress={cancel}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: theme.rounded.md,
                  borderWidth: 1,
                  borderColor: theme.accentSecondary,
                  alignItems: "center",
                }}
                accessibilityRole="button"
                accessibilityLabel="Anuluj wybór"
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

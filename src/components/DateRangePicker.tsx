import React, { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Calendar } from "./Calendar";

export const DateRangePicker: React.FC<{
  startDate: Date;
  endDate: Date;
  onChange: (range: { start: Date; end: Date }) => void;
}> = ({ startDate, endDate, onChange }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<"start" | "end">("start");
  const [local, setLocal] = useState({ start: startDate, end: endDate });

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "2-digit",
    }).format(d);

  const apply = () => {
    onChange(local);
    setOpen(false);
  };

  const cancel = () => {
    setLocal({ start: startDate, end: endDate }); // rollback
    setFocus("start");
    setOpen(false);
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      {/* Row with summary + opener */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.text, fontWeight: "700" }}>Date range</Text>
        <Text style={{ color: theme.text }}>
          {fmt(local.start)}-{fmt(local.end)}
        </Text>
      </View>

      <Pressable
        onPress={() => setOpen(true)}
        style={{
          paddingVertical: 12,
          borderRadius: theme.rounded.md,
          borderWidth: 1,
          borderColor: theme.accentSecondary,
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.link, fontWeight: "600" }}>
          Set date range
        </Text>
      </Pressable>

      {/* Centered modal with backdrop */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={cancel}
      >
        {/* Backdrop */}
        <Pressable
          onPress={cancel}
          style={{
            flex: 1,
            backgroundColor: theme.shadow, // półprzezroczysty
            justifyContent: "center",
            alignItems: "center",
            padding: theme.spacing.md,
          }}
        >
          {/* Stop propagation on card */}
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
              // delikatny cień
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: theme.spacing.sm,
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

            {/* Calendar */}
            <Calendar
              startDate={local.start}
              endDate={local.end}
              focus={focus}
              onChangeRange={(r) => setLocal(r)}
              onToggleFocus={() =>
                setFocus((f) => (f === "start" ? "end" : "start"))
              }
            />

            {/* Footer actions */}
            <View
              style={{
                flexDirection: "row",
                gap: theme.spacing.sm,
              }}
            >
              <Pressable
                onPress={apply}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: theme.rounded.md,
                  backgroundColor: theme.accent,
                  alignItems: "center",
                }}
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

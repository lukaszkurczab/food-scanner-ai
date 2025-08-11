// src/components/DateRangePicker.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";

type DateRange = { start: Date; end: Date };

type DateRangePickerProps = {
  startDate: Date;
  endDate: Date;
  onChangeRange: (next: DateRange) => void;
};

function format(d: Date) {
  try {
    return d.toLocaleDateString();
  } catch {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChangeRange,
}) => {
  const theme = useTheme();

  const shift = (which: "start" | "end", days: number) => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (which === "start") s.setDate(s.getDate() + days);
    else e.setDate(e.getDate() + days);
    if (s > e) {
      const tmp = new Date(s);
      s.setTime(e.getTime());
      e.setTime(tmp.getTime());
    }
    onChangeRange({ start: s, end: e });
  };

  const setToday = () => {
    const t = new Date();
    onChangeRange({ start: new Date(t), end: new Date(t) });
  };

  const setLast7 = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    onChangeRange({ start, end });
  };

  return (
    <View
      style={{
        padding: theme.spacing.md,
        borderRadius: theme.rounded.md,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        gap: theme.spacing.sm,
      }}
    >
      <Text
        style={{
          color: theme.text,
          fontFamily: theme.typography.fontFamily.bold,
          fontSize: theme.typography.size.md,
          marginBottom: 4,
        }}
      >
        Date range
      </Text>

      <View
        style={{
          flexDirection: "row",
          gap: theme.spacing.sm,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: theme.rounded.md,
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: theme.background,
          }}
        >
          <Text style={{ color: theme.textSecondary, marginBottom: 2 }}>
            Start
          </Text>
          <Text style={{ color: theme.text, fontWeight: "700" }}>
            {format(startDate)}
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 8,
              justifyContent: "space-between",
            }}
          >
            <Pressable
              onPress={() => shift("start", -1)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
              }}
            >
              <Text style={{ color: theme.text }}>-1d</Text>
            </Pressable>
            <Pressable
              onPress={() => shift("start", +1)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
              }}
            >
              <Text style={{ color: theme.text }}>+1d</Text>
            </Pressable>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: theme.rounded.md,
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: theme.background,
          }}
        >
          <Text style={{ color: theme.textSecondary, marginBottom: 2 }}>
            End
          </Text>
          <Text style={{ color: theme.text, fontWeight: "700" }}>
            {format(endDate)}
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 8,
              justifyContent: "space-between",
            }}
          >
            <Pressable
              onPress={() => shift("end", -1)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
              }}
            >
              <Text style={{ color: theme.text }}>-1d</Text>
            </Pressable>
            <Pressable
              onPress={() => shift("end", +1)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
              }}
            >
              <Text style={{ color: theme.text }}>+1d</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View
        style={{ flexDirection: "row", gap: 8, marginTop: theme.spacing.sm }}
      >
        <Pressable
          onPress={setToday}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
          }}
        >
          <Text style={{ color: theme.text }}>Today</Text>
        </Pressable>
        <Pressable
          onPress={setLast7}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
          }}
        >
          <Text style={{ color: theme.text }}>Last 7 days</Text>
        </Pressable>
      </View>
    </View>
  );
};

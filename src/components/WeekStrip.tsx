import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { IconButton } from "@/components";
import { MaterialIcons } from "@expo/vector-icons";

export type WeekDayItem = { date: Date; label: string; isToday: boolean };

type Props = {
  days: WeekDayItem[];
  selectedDate: Date;
  onSelect: (d: Date) => void;
  onOpenHistory: () => void;
  streak?: number;
};

export default function WeekStrip({
  days,
  selectedDate,
  onSelect,
  onOpenHistory,
}: Props) {
  const theme = useTheme();
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    ref.current?.scrollToEnd({ animated: false });
  }, [days?.length]);

  return (
    <View style={[styles.row, { width: "100%" }]}>
      <View style={{ flex: 1, minWidth: 0, gap: 8, flexDirection: "row" }}>
        {days.map((d) => {
          const selected =
            d.date.toDateString() === selectedDate.toDateString();
          const color = selected ? theme.accentSecondary : theme.text;

          return (
            <Pressable
              key={d.date.toISOString()}
              onPress={() => onSelect(d.date)}
              style={[styles.pill]}
            >
              <Text
                style={{
                  color,
                  fontSize: theme.typography.size.md,
                  fontFamily: d.isToday
                    ? theme.typography.fontFamily.bold
                    : theme.typography.fontFamily.medium,
                }}
              >
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rightBox}>
        <IconButton
          accessibilityLabel="Otwórz kalendarz historii"
          variant="ghost"
          onPress={onOpenHistory}
          icon={<MaterialIcons name="calendar-today" />}
        />
      </View>
    </View>
  );
}

const DAY_W = 36;
const DAY_H = 32;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    width: DAY_W,
    height: DAY_H,
    borderRadius: DAY_H / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rightBox: {
    width: 56,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
  },
});

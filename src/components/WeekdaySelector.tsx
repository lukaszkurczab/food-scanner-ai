import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  value: number[];
  onChange: (next: number[]) => void;
};

const labels = ["S", "M", "T", "W", "T", "F", "S"];

export const WeekdaySelector: React.FC<Props> = ({ value, onChange }) => {
  const theme = useTheme();
  return (
    <View style={[styles.row, { gap: 8 }]}>
      {labels.map((l, idx) => {
        const active = value.includes(idx);
        return (
          <Pressable
            key={idx}
            onPress={() => {
              const set = new Set(value);
              if (set.has(idx)) set.delete(idx);
              else set.add(idx);
              onChange(Array.from(set).sort((a, b) => a - b));
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: theme.rounded.sm,
              backgroundColor: active ? theme.accentSecondary : theme.card,
              borderWidth: 1,
              borderColor: active ? theme.accentSecondary : theme.border,
            }}
          >
            <Text
              style={{
                color: active ? theme.onAccent : theme.text,
                fontFamily: theme.typography.fontFamily.medium,
              }}
            >
              {l}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
});

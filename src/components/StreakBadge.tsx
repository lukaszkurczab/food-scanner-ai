import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/theme/useTheme";

export function StreakBadge({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: theme.accent,
      }}
    >
      <Text
        style={{
          color: theme.card,
          fontFamily: theme.typography.fontFamily.bold,
          fontSize: theme.typography.size.md,
        }}
      >
        🔥 {value}
      </Text>
    </View>
  );
}

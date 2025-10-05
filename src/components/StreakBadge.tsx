import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/theme/useTheme";

export function StreakBadge({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: theme.accentSecondary,
        marginLeft: 8,
      }}
    >
      <Text
        style={{
          color: theme.onAccent,
          fontFamily: theme.typography.fontFamily.bold,
          fontSize: theme.typography.size.md,
        }}
      >
        {value}🔥
      </Text>
    </View>
  );
}

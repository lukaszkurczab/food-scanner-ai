import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

export const OfflineBanner = () => {
  const theme = useTheme();
  return (
    <View style={{ padding: 8, backgroundColor: theme.warning.background }}>
      <Text style={{ color: theme.warning.text }}>
        Offline. Showing local data.
      </Text>
    </View>
  );
};

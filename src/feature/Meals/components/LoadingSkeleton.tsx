import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/useTheme";

export const LoadingSkeleton: React.FC<{ height?: number }> = ({
  height = 80,
}) => {
  const theme = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: 12,
        backgroundColor: theme.disabled.background,
        marginBottom: 12,
      }}
    />
  );
};

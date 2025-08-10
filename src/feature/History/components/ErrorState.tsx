import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type Props = { message: string; onRetry?: () => void };

export const ErrorState: React.FC<Props> = ({ message, onRetry }) => {
  const theme = useTheme();
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Text
        style={{ color: theme.error.text, fontWeight: "700", marginBottom: 8 }}
      >
        {message}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: theme.accent,
          }}
        >
          <Text style={{ color: theme.onAccent }}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
};

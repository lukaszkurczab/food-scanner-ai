import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type ErrorBoxProps = {
  message: string;
  style?: ViewStyle;
};

export const ErrorBox: React.FC<ErrorBoxProps> = ({ message, style }) => {
  const theme = useTheme();
  if (!message) return null;

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: theme.error.background,
          borderColor: theme.error.border,
          borderRadius: theme.rounded.sm,
          padding: theme.spacing.sm,
          marginBottom: theme.spacing.md,
        },
        style,
      ]}
      accessible
      accessibilityRole="alert"
    >
      <Text
        style={{
          color: theme.error.text,
          fontFamily: theme.typography.fontFamily.medium,
          fontSize: theme.typography.size.sm,
        }}
      >
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
  },
});

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

type ErrorBoxProps = {
  message: string;
  style?: ViewStyle;
};

export const ErrorBox: React.FC<ErrorBoxProps> = ({ message, style }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!message) return null;

  return (
    <View
      style={[styles.box, style]}
      accessible
      accessibilityRole="alert"
    >
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    box: {
      borderWidth: 1,
      width: "100%",
      alignItems: "center",
      backgroundColor: theme.error.background,
      borderColor: theme.error.border,
      borderRadius: theme.rounded.sm,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    message: {
      color: theme.error.text,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.sm,
    },
  });

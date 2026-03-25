import React, { useMemo } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  PressableProps,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type ErrorButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
} & PressableProps;

export const ErrorButton: React.FC<ErrorButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  ...rest
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const textColor = theme.error.text;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.buttonBase,
        styles.buttonColors,
        pressed && !isDisabled ? styles.buttonPressed : null,
        isDisabled ? styles.buttonDisabled : null,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={!isDisabled ? { color: theme.overlay } : undefined}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    buttonBase: {
      borderWidth: 1,
      borderRadius: theme.rounded.full,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignSelf: "stretch",
      width: "100%",
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonColors: {
      backgroundColor: theme.error.surface,
      borderColor: theme.error.main,
    },
    buttonPressed: {
      opacity: 0.84,
    },
    buttonDisabled: {
      opacity: 0.56,
    },
    label: {
      color: theme.error.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
    },
  });

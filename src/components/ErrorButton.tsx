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
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);

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
        <Text style={styles.label}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    buttonBase: {
      borderWidth: 1.5,
      borderRadius: theme.rounded.full,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignSelf: "stretch",
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    buttonColors: {
      backgroundColor: theme.error.background,
      borderColor: theme.error.border,
    },
    buttonPressed: {
      opacity: 0.8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    label: {
      color: theme.error.text,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.bold,
      letterSpacing: 0.2,
      textAlign: "center",
    },
  });

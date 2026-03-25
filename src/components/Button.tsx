import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
  type PressableProps,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export type ButtonProps = {
  label?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
} & PressableProps;

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
  accessibilityLabel,
  onPress,
  ...rest
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const tokens = theme.button[variant];
  const isDisabled = disabled || loading;
  const content = children ?? label;
  const resolvedAccessibilityLabel =
    accessibilityLabel ?? (typeof content === "string" ? content : undefined);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      android_ripple={!isDisabled ? { color: theme.overlay } : undefined}
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        fullWidth ? styles.fullWidth : styles.autoWidth,
        {
          backgroundColor: isDisabled
            ? tokens.disabledBackground
            : pressed
              ? tokens.pressedBackground
              : tokens.background,
          borderColor: isDisabled
            ? tokens.disabledBorder
            : pressed
              ? tokens.pressedBorder
              : tokens.border,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isDisabled ? tokens.disabledText : tokens.text}
        />
      ) : (
        <Text
          style={[
            styles.label,
            { color: isDisabled ? tokens.disabledText : tokens.text },
            textStyle,
          ]}
        >
          {content}
        </Text>
      )}
    </Pressable>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    button: {
      minHeight: 52,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    fullWidth: {
      alignSelf: "stretch",
      width: "100%",
    },
    autoWidth: {
      alignSelf: "flex-start",
    },
    label: {
      textAlign: "center",
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
    },
  });

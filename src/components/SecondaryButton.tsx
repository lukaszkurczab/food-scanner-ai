import React, { useMemo } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  PressableProps,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
} & PressableProps;

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  ...rest
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const isDisabled = disabled || loading;
  const textColor = isDisabled ? theme.disabled.text : theme.cta.secondaryText;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isDisabled ? styles.buttonDisabled : null,
        pressed && !isDisabled ? styles.buttonPressed : null,
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
        <Text style={[styles.label, { color: textColor }, textStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    button: {
      alignSelf: "stretch",
      width: "100%",
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.cta.secondaryBorder,
      backgroundColor: theme.cta.secondaryBackground,
      borderRadius: theme.rounded.full,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    buttonPressed: {
      opacity: 0.84,
    },
    buttonDisabled: {
      opacity: 0.6,
      borderColor: theme.disabled.border,
      backgroundColor: theme.disabled.background,
    },
    label: {
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
    },
  });

import React, { useMemo } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  StyleSheet,
  PressableProps,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type PrimaryButtonProps = {
  label?: string;
  children?: React.ReactNode;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
} & PressableProps;

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  children,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...rest
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const backgroundColor = theme.cta.primaryBackground;
  const textColor = theme.cta.primaryText;
  const disabledBg = theme.disabled.background;
  const disabledText = theme.disabled.text;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDisabled ? disabledBg : backgroundColor,
          opacity: pressed && !isDisabled ? 0.84 : isDisabled ? 0.6 : 1,
        },
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
        <Text
          style={[
            styles.label,
            {
              color: isDisabled ? disabledText : textColor,
            },
            textStyle,
          ]}
        >
          {children || label}
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
      borderRadius: theme.rounded.full,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: theme.isDark ? 0.24 : 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    label: {
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
    },
  });

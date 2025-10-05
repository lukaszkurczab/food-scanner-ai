import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  StyleSheet,
  PressableProps,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type PrimaryButtonProps = {
  label?: string;
  children?: React.ReactNode;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<any>;
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
  const backgroundColor = theme.accentSecondary;
  const textColor = theme.onAccent;
  const disabledBg = theme.disabled.background;
  const disabledText = theme.disabled.text;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDisabled ? disabledBg : backgroundColor,
          opacity: pressed && !isDisabled ? 0.8 : isDisabled ? 0.6 : 1,
          borderRadius: theme.rounded.lg,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          shadowColor: theme.shadow,
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
              fontSize: theme.typography.size.md,
              fontFamily: theme.typography.fontFamily.bold,
              letterSpacing: 0.7,
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

const styles = StyleSheet.create({
  button: {
    alignSelf: "stretch",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  label: {
    fontWeight: "bold",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});

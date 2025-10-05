import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  PressableProps,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<any>;
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

  const textColor = disabled ? theme.textSecondary : theme.accentSecondary;
  const borderColor = textColor;

  return (
    <Pressable
      style={({ pressed }) => [
        {
          borderColor,
          borderWidth: 1,
          borderRadius: theme.rounded.lg,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          alignSelf: "stretch",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed && !disabled ? 0.9 : disabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={!disabled ? { color: theme.overlay } : undefined}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text
          style={[
            {
              color: textColor,
              fontSize: theme.typography.size.base,
              fontFamily: theme.typography.fontFamily.bold,
              letterSpacing: 1,
              textAlign: "center",
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

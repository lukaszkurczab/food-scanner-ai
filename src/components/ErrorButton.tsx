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

  const borderColor = theme.error.border;
  const textColor = theme.error.text;
  const backgroundColor = theme.error.background;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor,
          borderColor,
          borderWidth: 1.5,
          borderRadius: theme.rounded.full,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          alignSelf: "stretch",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed && !isDisabled ? 0.8 : isDisabled ? 0.6 : 1,
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
          style={{
            color: textColor,
            fontSize: theme.typography.size.base,
            fontWeight: "bold",
            fontFamily: theme.typography.fontFamily.bold,
            letterSpacing: 0.2,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

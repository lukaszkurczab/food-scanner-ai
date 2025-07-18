import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  const theme = useTheme();

  const backgroundColor = theme.accent;
  const textColor = theme.onAccent;
  const disabledBg = theme.disabled.background;
  const disabledText = theme.disabled.text;

  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: isDisabled ? disabledBg : backgroundColor,
          opacity: pressed && !isDisabled ? 0.8 : isDisabled ? 0.6 : 1,
          borderRadius: theme.rounded.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          alignSelf: "stretch",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={!isDisabled ? { color: theme.overlay } : undefined}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text
          style={{
            color: isDisabled ? disabledText : textColor,
            fontSize: theme.typography.size.base,
            fontWeight: "bold",
            fontFamily: theme.typography.fontFamily.bold,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

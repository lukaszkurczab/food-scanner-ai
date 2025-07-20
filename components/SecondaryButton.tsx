import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  const theme = useTheme();

  const borderColor = disabled ? theme.disabled.background : theme.accent;
  const textColor = disabled ? theme.disabled.text : theme.accent;
  const backgroundColor = "transparent";

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor,
          borderColor,
          borderWidth: 1.5,
          borderRadius: theme.rounded.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          alignSelf: "stretch",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed && !disabled ? 0.8 : disabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={!disabled ? { color: theme.overlay } : undefined}
      accessibilityRole="button"
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
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

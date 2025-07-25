import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  PressableProps,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
} & PressableProps;

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  ...rest
}) => {
  const theme = useTheme();

  const borderColor = disabled ? theme.textSecondary : theme.accentSecondary;
  const textColor = disabled ? theme.textSecondary : theme.accentSecondary;
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

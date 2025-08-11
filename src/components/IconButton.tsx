import React from "react";
import { Pressable, StyleProp, ViewStyle, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

type IconButtonProps = {
  icon: React.ReactElement<{ size?: number; color?: string }>;
  onPress: () => void;
  size?: number;
  variant?: "solid" | "ghost";
  backgroundColor?: string;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 40,
  variant = "solid",
  backgroundColor,
  iconColor,
  style,
  disabled = false,
  accessibilityLabel,
}) => {
  const theme = useTheme();

  const resolvedBg =
    variant === "solid" ? backgroundColor || theme.card : "transparent";

  const resolvedIconColor =
    iconColor || (variant === "solid" ? theme.onAccent : theme.text);

  const iconSize = Math.round(size * 0.8);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: resolvedBg,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          ...(variant === "ghost"
            ? {
                minWidth: 40,
                minHeight: 40,
                padding: Math.max(0, (40 - iconSize) / 2),
              }
            : {}),
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      android_ripple={
        variant === "solid" && !disabled ? { color: theme.overlay } : undefined
      }
    >
      {React.cloneElement(icon, {
        size: icon.props.size ?? iconSize,
        color: icon.props.color ?? resolvedIconColor,
      })}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

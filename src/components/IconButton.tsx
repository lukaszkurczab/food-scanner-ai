import React from "react";
import { Pressable, StyleProp, ViewStyle, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type IconButtonProps = {
  icon: React.ReactElement<{ size?: number; color?: string }>;
  onPress: () => void;
  size?: number;
  variant?: "solid" | "ghost";
  backgroundColor?: string;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
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
}) => {
  const theme = useTheme();

  const resolvedBg =
    variant === "solid" ? backgroundColor || theme.accent : "transparent";

  const resolvedIconColor =
    iconColor || (variant === "solid" ? theme.onAccent : theme.text);

  const iconSize = Math.round(size * 0.6);

  return (
    <Pressable
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

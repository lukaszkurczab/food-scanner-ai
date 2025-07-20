import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  StyleSheet,
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
        styles.button,
        {
          backgroundColor: isDisabled ? disabledBg : backgroundColor,
          opacity: pressed && !isDisabled ? 0.8 : isDisabled ? 0.6 : 1,
          borderRadius: theme.rounded.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
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
          style={[
            styles.label,
            {
              color: isDisabled ? disabledText : textColor,
              fontSize: theme.typography.size.base,
              fontFamily: theme.typography.fontFamily.bold,
            },
          ]}
        >
          {label}
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
  },
  label: {
    fontWeight: "bold",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});

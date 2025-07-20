import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  Platform,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import * as Haptics from "expo-haptics";

type DangerButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const DangerButton: React.FC<DangerButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  const theme = useTheme();

  const backgroundColor =
    disabled || loading ? theme.disabled.background : theme.error.background;
  const textColor =
    disabled || loading ? theme.disabled.text : theme.error.text;

  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (!isDisabled) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      onPress();
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderRadius: theme.rounded.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          opacity: pressed && !isDisabled ? 0.8 : isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={handlePress}
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
              color: textColor,
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

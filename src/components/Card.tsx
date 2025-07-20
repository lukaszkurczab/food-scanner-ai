import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: "default" | "stat" | "outlined";
  elevation?: number;
};

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = "default",
  elevation = 2,
}) => {
  const theme = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: variant === "outlined" ? theme.background : theme.card,
    borderRadius: variant === "stat" ? theme.rounded.sm : theme.rounded.md,
    borderWidth: variant === "outlined" ? 1 : 0,
    borderColor: variant === "outlined" ? theme.border : undefined,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...(variant === "stat"
      ? {
          width: 100,
          aspectRatio: 1,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 0,
        }
      : {}),
    ...(Platform.OS === "android" && variant !== "outlined"
      ? { elevation }
      : {}),
  };

  const shadowStyle =
    variant !== "outlined" && Platform.OS !== "android" ? styles.shadow : {};

  const Content = (
    <View style={[cardStyle, shadowStyle, style]}>{children}</View>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          cardStyle,
          shadowStyle,
          style,
          { opacity: pressed ? 0.92 : 1 },
        ]}
        onPress={onPress}
        android_ripple={
          variant !== "outlined"
            ? { color: theme.overlay, borderless: false }
            : undefined
        }
      >
        {children}
      </Pressable>
    );
  }
  return Content;
};

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});

import React, { useRef, useEffect } from "react";
import { Pressable, Animated, StyleSheet, View } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type ButtonToggleProps = {
  accessibilityLabel?: string;
};

export const ButtonToggle: React.FC<ButtonToggleProps> = ({
  accessibilityLabel,
}) => {
  const { mode, toggleTheme, accentSecondary, textSecondary, card, border } =
    useTheme();
  const isDark = mode === "dark";

  const anim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: isDark ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isDark, anim]);

  const thumbTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 29],
  });

  return (
    <Pressable
      onPress={toggleTheme}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: isDark }}
      style={({ pressed }) => [
        styles.switch,
        {
          backgroundColor: isDark ? accentSecondary : textSecondary,
          borderColor: border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: card,
            transform: [{ translateX: thumbTranslate }],
          },
        ]}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  switch: {
    width: 60,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    padding: 4,
    marginVertical: 2,
    overflow: "hidden",
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: "absolute",
    top: 2.5,
    left: 2.5,
  },
});

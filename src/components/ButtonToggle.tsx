import React, { useRef, useEffect } from "react";
import { Pressable, Animated, StyleSheet } from "react-native";

type ButtonToggleProps = {
  value: boolean;
  onToggle: (value: boolean) => void;
  accessibilityLabel?: string;
  trackColor?: string;
  thumbColor?: string;
  borderColor?: string;
};

export const ButtonToggle: React.FC<ButtonToggleProps> = ({
  value,
  onToggle,
  accessibilityLabel,
  trackColor = "#B0B0B0",
  thumbColor = "#FFF",
  borderColor = "#CCC",
}) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const thumbTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 29],
  });

  return (
    <Pressable
      onPress={() => onToggle(!value)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      style={({ pressed }) => [
        styles.switch,
        {
          backgroundColor: trackColor,
          borderColor: borderColor,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbColor,
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

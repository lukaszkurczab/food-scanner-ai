import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  message: string;
  visible: boolean;
  onHide?: () => void;
  style?: ViewStyle;
  durationMs?: number;
};

export const TopToast: React.FC<Props> = ({
  message,
  visible,
  onHide,
  style,
  durationMs = 2200,
}) => {
  const theme = useTheme();
  const y = useRef(new Animated.Value(-80)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(y, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        const t = setTimeout(() => {
          Animated.parallel([
            Animated.timing(y, {
              toValue: -80,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(op, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
          ]).start(() => onHide?.());
        }, durationMs);
        return () => clearTimeout(t);
      });
    }
  }, [visible, durationMs, onHide, y, op]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY: y }],
          opacity: op,
          backgroundColor: theme.overlay,
          borderColor: theme.accentSecondary,
        },
        style,
      ]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.text, { color: theme.text }]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    zIndex: 10,
  },
  text: { fontSize: 14, fontWeight: "600" },
});

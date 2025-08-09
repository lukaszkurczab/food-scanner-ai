import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

export const TypingDots: React.FC = () => {
  const theme = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 350,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ])
      ).start();

    make(dot1, 0);
    make(dot2, 150);
    make(dot3, 300);
  }, [dot1, dot2, dot3]);

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.card, shadowColor: theme.shadow },
      ]}
    >
      {[dot1, dot2, dot3].map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: theme.textSecondary,
              transform: [
                {
                  translateY: v.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -3],
                  }),
                },
              ],
              opacity: v.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 6,
    elevation: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type LoaderProps = {
  text?: string;
  subtext?: string;
};

export default function Loader({
  text = "Analyzing your meal...",
  subtext = "This may take a few second.",
}: LoaderProps) {
  const theme = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: "#1696ff",
            transform: [{ rotate }],
          },
        ]}
      />
      <Text style={[styles.title, { color: theme.text }]}>{text}</Text>
      <Text style={[styles.subtext, { color: theme.textSecondary }]}>
        {subtext}
      </Text>
    </View>
  );
}

const RING_SIZE = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 8,
    borderColor: "#1696ff",
    borderStyle: "solid",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 14,
  },
  subtext: {
    fontSize: 20,
    opacity: 0.85,
    textAlign: "center",
  },
});

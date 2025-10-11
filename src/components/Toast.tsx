import React, { useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "@/theme/useTheme";

let showToast: ((msg: string) => void) | null = null;

export function ToastContainer() {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-50)).current;
  const messageRef = useRef("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = (msg: string) => {
    messageRef.current = msg;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -50,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2500);
  };

  useEffect(() => {
    showToast = show;
    return () => {
      showToast = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: theme.text }]}>
        {messageRef.current}
      </Text>
    </Animated.View>
  );
}

export const Toast = {
  show: (msg: string) => {
    if (typeof showToast === "function") showToast(msg);
  },
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: Dimensions.get("window").width * 0.9,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  text: {
    fontSize: 15,
    textAlign: "center",
  },
});

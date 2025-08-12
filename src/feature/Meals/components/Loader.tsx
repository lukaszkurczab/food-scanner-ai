import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme/useTheme";

type LoaderProps = {
  text?: string;
  subtext?: string;
  size?: number | "small" | "large";
};

export default function Loader({
  text = "Analyzing your meal...",
  subtext = "This may take a few seconds.",
  size = "large",
}: LoaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator
        size={size}
        color={theme.accentSecondary || "#1696ff"}
        style={{ marginBottom: 36 }}
      />
      <Text style={[styles.title, { color: theme.text }]}>{text}</Text>
      <Text style={[styles.subtext, { color: theme.textSecondary }]}>
        {subtext}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtext: { fontSize: 16, opacity: 0.85, textAlign: "center" },
});

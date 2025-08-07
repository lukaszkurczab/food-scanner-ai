import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

export const TargetProgressBar = ({ current, target }: { current: number; target: number }) => {
  const theme = useTheme();
  const percentage = Math.min(100, Math.round((current / target) * 100));

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text }]}>{`${current} of ${target} kcal`}</Text>
      <View style={[styles.bar, { backgroundColor: theme.border }]}>
        <View
          style={[styles.progress, {
            width: `${percentage}%`,
            backgroundColor: theme.accent,
          }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { marginBottom: 4, fontWeight: "bold" },
  bar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progress: {
    height: 8,
  },
});
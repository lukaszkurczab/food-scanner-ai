import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

export const TargetProgressBar = ({
  current,
  target,
}: {
  current: number;
  target: number;
}) => {
  const theme = useTheme();
  const percentage = Math.min(100, Math.round((current / target) * 100));

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 8,
        }}
      >
        <Text
          style={[
            styles.label,
            { color: theme.text, fontSize: theme.typography.size.lg },
          ]}
        >{`${current} of ${target} kcal`}</Text>
        <Text
          style={[
            styles.labelSecondary,
            { color: theme.textSecondary, fontSize: theme.typography.size.lg },
          ]}
        >{`${(current / target).toFixed(0)} %`}</Text>
      </View>
      <View style={[styles.bar, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progress,
            {
              width: `${percentage}%`,
              backgroundColor: theme.accent,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { marginBottom: 4, fontWeight: "bold" },
  labelSecondary: { fontWeight: "medium" },
  bar: {
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  progress: {
    height: 16,
    borderRadius: 8,
  },
});

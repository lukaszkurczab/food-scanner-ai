import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

export const TargetProgressBar = ({
  current,
  target,
  onThreshold,
  thresholdPct = 0.8,
}: {
  current: number;
  target: number;
  onThreshold?: () => void;
  thresholdPct?: number;
}) => {
  const theme = useTheme();
  const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  if (onThreshold && target > 0 && current / target >= thresholdPct) {
    onThreshold();
  }

  return (
    <View style={{ flexGrow: 1 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={[
            styles.label,
            { color: theme.text, fontSize: theme.typography.size.lg },
          ]}
        >{`${current} of ${target} kcal`}</Text>
        <View
          style={{
            paddingHorizontal: 10,
            height: "100%",
            alignSelf: "center",
          }}
        >
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: theme.typography.size.md,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >{`${percentage.toFixed(0)} %`}</Text>
        </View>
      </View>
      <View style={[styles.bar, { backgroundColor: theme.border }]}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: theme.accent,
            position: "absolute",
            left: 2,
            top: 3,
          }}
        />
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
  label: { marginBottom: 6, fontWeight: "700" },
  bar: {
    height: 14,
    borderRadius: 999,
    overflow: "hidden",
  },
  progress: {
    height: 14,
    borderRadius: 999,
  },
});

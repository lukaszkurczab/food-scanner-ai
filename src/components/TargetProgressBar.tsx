import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  current: number;
  target: number;
  onThreshold?: () => void;
  thresholdPct?: number;
  height?: number;
};

export const TargetProgressBar = ({
  current,
  target,
  onThreshold,
  thresholdPct = 0.8,
  height,
}: Props) => {
  const theme = useTheme();
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  if (onThreshold && target > 0 && current / target >= thresholdPct) {
    onThreshold();
  }

  const minH = 16;
  const inheritedHeight =
    typeof height === "number" && height > 0 ? height : minH;
  const dotSize = Math.max(10, (inheritedHeight ?? minH) - 6);
  const dotTop = Math.max(0, ((inheritedHeight ?? minH) - dotSize) / 2);

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
        <View style={{ paddingHorizontal: 10, alignSelf: "center" }}>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: theme.typography.size.md,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >{`${pct.toFixed(0)}%`}</Text>
        </View>
      </View>

      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.border,
            borderRadius: theme.rounded.full,
            height: inheritedHeight,
            minHeight: minH,
          },
        ]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Progress: ${pct.toFixed(0)}%`}
      >
        <View
          style={{
            width: dotSize,
            height: inheritedHeight,
            borderRadius: inheritedHeight / 2,
            backgroundColor: theme.accent,
            position: "absolute",
          }}
        />
        <View
          style={[
            styles.progress,
            {
              width: `${pct}%`,
              backgroundColor: theme.accent,
              borderRadius: theme.rounded.full,
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
    width: "100%",
    overflow: "hidden",
  },
  progress: {
    height: "100%",
  },
});

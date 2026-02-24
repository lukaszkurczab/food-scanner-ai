import { useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
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
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  if (onThreshold && target > 0 && current / target >= thresholdPct) {
    onThreshold();
  }

  const minH = 16;
  const inheritedHeight =
    typeof height === "number" && height > 0 ? height : minH;
  const dotSize = Math.max(10, (inheritedHeight ?? minH) - 6);
  const barDynamicStyle = useMemo(
    () => ({
      height: inheritedHeight,
      minHeight: minH,
    }),
    [inheritedHeight]
  );
  const dotDynamicStyle = useMemo(
    () => ({
      width: dotSize,
      height: inheritedHeight,
      borderRadius: inheritedHeight / 2,
    }),
    [dotSize, inheritedHeight]
  );
  const progressDynamicStyle = useMemo<ViewStyle>(
    () => ({ width: `${pct}%` as `${number}%` }),
    [pct]
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{`${current} of ${target} kcal`}</Text>
        <View style={styles.percentWrapper}>
          <Text style={styles.percentText}>{`${pct.toFixed(0)}%`}</Text>
        </View>
      </View>

      <View
        style={[styles.bar, barDynamicStyle]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Progress: ${pct.toFixed(0)}%`}
      >
        <View style={[styles.dot, dotDynamicStyle]} />
        <View style={[styles.progress, progressDynamicStyle]} />
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xs,
    },
    label: {
      marginBottom: theme.spacing.sm - theme.spacing.xs / 2,
      color: theme.text,
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.bold,
    },
    percentWrapper: {
      paddingHorizontal: theme.spacing.md - theme.spacing.xs + theme.spacing.xs / 2,
      alignSelf: "center",
    },
    percentText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.medium,
    },
    bar: {
      width: "100%",
      overflow: "hidden",
      backgroundColor: theme.border,
      borderRadius: theme.rounded.full,
    },
    dot: {
      backgroundColor: theme.accent,
      position: "absolute",
    },
    progress: {
      height: "100%",
      backgroundColor: theme.accent,
      borderRadius: theme.rounded.full,
    },
  });

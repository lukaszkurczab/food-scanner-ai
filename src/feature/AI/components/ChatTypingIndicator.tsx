import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

const DOT_COUNT = 3;
const CYCLE_DURATION_MS = 1400;
const BASE_DOT_OPACITY = 0.32;
const PEAK_DOT_OPACITY = 0.94;
const BASE_DOT_SCALE = 0.92;
const PEAK_DOT_SCALE = 1.04;

type Props = {
  label: string;
};

export function ChatTypingIndicator({ label }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: CYCLE_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    progress.setValue(0);
    loop.start();

    return () => {
      loop.stop();
      progress.stopAnimation();
    };
  }, [progress]);

  const dots = Array.from({ length: DOT_COUNT }, (_, index) => {
    const pulseStart = Math.max(0.001, index * 0.18);
    const pulseMid = Math.min(1, pulseStart + 0.14);
    const pulseEnd = Math.min(1, pulseStart + 0.36);

    const opacity = progress.interpolate({
      inputRange: [0, pulseStart, pulseMid, pulseEnd, 1],
      outputRange: [
        BASE_DOT_OPACITY,
        BASE_DOT_OPACITY,
        PEAK_DOT_OPACITY,
        BASE_DOT_OPACITY,
        BASE_DOT_OPACITY,
      ],
      extrapolate: "clamp",
    });

    const scale = progress.interpolate({
      inputRange: [0, pulseStart, pulseMid, pulseEnd, 1],
      outputRange: [
        BASE_DOT_SCALE,
        BASE_DOT_SCALE,
        PEAK_DOT_SCALE,
        BASE_DOT_SCALE,
        BASE_DOT_SCALE,
      ],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        key={`dot-${index}`}
        testID={`chat-typing-dot-${index + 1}`}
        style={[
          styles.dot,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
    );
  });

  return (
    <View
      testID="chat-typing-indicator"
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.bubble}
    >
      <View style={styles.dotsRow}>{dots}</View>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    bubble: {
      alignSelf: "flex-start",
      marginBottom: theme.spacing.md,
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      borderRadius: theme.rounded.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      minHeight: 34,
      justifyContent: "center",
    },
    dotsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.textTertiary,
    },
  });

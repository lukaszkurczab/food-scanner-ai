import React, { useEffect, useMemo, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { isE2EModeEnabled } from "@/services/e2e/config";

export const TypingDots: React.FC = () => {
  const isE2E = isE2EModeEnabled();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isE2E) return;

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
        ]),
      ).start();

    make(dot1, 0);
    make(dot2, 150);
    make(dot3, 300);
  }, [dot1, dot2, dot3, isE2E]);

  if (isE2E) return null;

  return (
    <View style={styles.wrap}>
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

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrap: {
      alignSelf: "flex-start",
      borderRadius: theme.rounded.md,
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      flexDirection: "row",
      gap: theme.spacing.xs + 2,
      elevation: 2,
      backgroundColor: theme.surfaceElevated,
      shadowColor: theme.shadow,
    },
    dot: {
      width: theme.spacing.xs + 2,
      height: theme.spacing.xs + 2,
      borderRadius: (theme.spacing.xs + 2) / 2,
    },
  });

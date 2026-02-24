import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  message: string;
  visible: boolean;
  onHide?: () => void;
  style?: ViewStyle;
  durationMs?: number;
};

export const TopToast: React.FC<Props> = ({
  message,
  visible,
  onHide,
  style,
  durationMs = 2200,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const y = useRef(new Animated.Value(-80)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(y, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        const t = setTimeout(() => {
          Animated.parallel([
            Animated.timing(y, {
              toValue: -80,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(op, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
          ]).start(() => onHide?.());
        }, durationMs);
        return () => clearTimeout(t);
      });
    }
  }, [visible, durationMs, onHide, y, op]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        { transform: [{ translateY: y }], opacity: op },
        style,
      ]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    toast: {
      position: "absolute",
      top: theme.spacing.sm,
      left: theme.spacing.sm,
      right: theme.spacing.sm,
      borderRadius: theme.rounded.sm,
      borderWidth: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      zIndex: 10,
      backgroundColor: theme.overlay,
      borderColor: theme.accentSecondary,
    },
    text: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.text,
    },
  });

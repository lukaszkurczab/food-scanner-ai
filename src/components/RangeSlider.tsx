import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  useAnimatedGestureHandler,
} from "react-native-reanimated";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import { useTheme } from "@/theme/useTheme";

type RangeSliderProps = {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
  disabled?: boolean;
};

type Ctx = { startX: number };

const THUMB_RADIUS = 12;

export const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  disabled = false,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [trackW, setTrackW] = useState(1);
  const trackWAnim = useSharedValue(1);

  const leftX = useSharedValue(0);
  const rightX = useSharedValue(0);

  useEffect(() => {
    if (!trackW) return;

    const toPx = (v: number) =>
      Math.max(0, Math.min(trackW, ((v - min) / (max - min)) * trackW));

    const lx = toPx(value[0]);
    const rx = toPx(value[1]);

    leftX.value = withTiming(Math.min(lx, rx));
    rightX.value = withTiming(Math.max(lx, rx));
  }, [value, trackW, min, max, leftX, rightX]);

  const fillStyle = useAnimatedStyle(() => {
    const l = Math.min(leftX.value, rightX.value);
    const r = Math.max(leftX.value, rightX.value);
    return { left: l, width: r - l };
  });

  const leftThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value - THUMB_RADIUS }],
  }));

  const rightThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value - THUMB_RADIUS }],
  }));

  const calcVal = (
    xPx: number,
    minV: number,
    maxV: number,
    stepV: number,
    trackPx: number,
  ) => {
    "worklet";
    const ratio = Math.max(0, Math.min(1, xPx / Math.max(1, trackPx)));
    let v = minV + ratio * (maxV - minV);
    v = Math.round(v / stepV) * stepV;
    if (v < minV) v = minV;
    if (v > maxV) v = maxV;
    return v;
  };

  const onLeftGesture = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    Ctx
  >({
    onStart: (_, ctx) => {
      ctx.startX = leftX.value;
    },
    onActive: (e, ctx) => {
      if (disabled) return;

      let x = ctx.startX + e.translationX;
      if (x < 0) x = 0;
      if (x > rightX.value) x = rightX.value;

      leftX.value = x;

      const lVal = calcVal(x, min, max, step, trackWAnim.value);
      const rVal = calcVal(rightX.value, min, max, step, trackWAnim.value);
      runOnJS(onChange)([lVal, rVal]);
    },
  });

  const onRightGesture = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    Ctx
  >({
    onStart: (_, ctx) => {
      ctx.startX = rightX.value;
    },
    onActive: (e, ctx) => {
      if (disabled) return;

      let x = ctx.startX + e.translationX;
      if (x < leftX.value) x = leftX.value;
      if (x > trackWAnim.value) x = trackWAnim.value;

      rightX.value = x;

      const lVal = calcVal(leftX.value, min, max, step, trackWAnim.value);
      const rVal = calcVal(x, min, max, step, trackWAnim.value);
      runOnJS(onChange)([lVal, rVal]);
    },
  });

  const onTrackPress = (evt: { nativeEvent: { locationX: number } }) => {
    if (disabled || !trackW) return;

    const x = Math.max(0, Math.min(trackW, evt.nativeEvent.locationX));
    const dL = Math.abs(x - leftX.value);
    const dR = Math.abs(x - rightX.value);

    if (dL <= dR) {
      const clamped = Math.max(0, Math.min(rightX.value, x));
      leftX.value = withTiming(clamped);

      const lVal =
        Math.round((min + (clamped / trackW) * (max - min)) / step) * step;
      const rVal =
        Math.round((min + (rightX.value / trackW) * (max - min)) / step) * step;

      onChange([
        Math.max(min, Math.min(max, lVal)),
        Math.max(min, Math.min(max, rVal)),
      ]);
    } else {
      const clamped = Math.max(leftX.value, Math.min(trackW, x));
      rightX.value = withTiming(clamped);

      const lVal =
        Math.round((min + (leftX.value / trackW) * (max - min)) / step) * step;
      const rVal =
        Math.round((min + (clamped / trackW) * (max - min)) / step) * step;

      onChange([
        Math.max(min, Math.min(max, lVal)),
        Math.max(min, Math.min(max, rVal)),
      ]);
    }
  };

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTrackW(w);
    trackWAnim.value = w;

    const toPx = (v: number) =>
      Math.max(0, Math.min(w, ((v - min) / (max - min)) * w));

    leftX.value = withTiming(toPx(value[0]));
    rightX.value = withTiming(toPx(value[1]));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {label ? <Text style={styles.headerLabel}>{label}</Text> : <View />}
        <Text style={styles.headerValue}>
          {value[0]}–{value[1]}
        </Text>
      </View>

      <Pressable
        onLayout={onTrackLayout}
        onPress={onTrackPress}
        disabled={disabled}
        style={[styles.track, disabled && styles.trackDisabled]}
      >
        <Animated.View style={[styles.fill, fillStyle]} />

        <View style={styles.overlay}>
          <PanGestureHandler enabled={!disabled} onGestureEvent={onLeftGesture}>
            <Animated.View
              style={[
                styles.thumb,
                leftThumbStyle,
                disabled && styles.thumbDisabled,
              ]}
            />
          </PanGestureHandler>

          <PanGestureHandler
            enabled={!disabled}
            onGestureEvent={onRightGesture}
          >
            <Animated.View
              style={[
                styles.thumb,
                rightThumbStyle,
                disabled && styles.thumbDisabled,
              ]}
            />
          </PanGestureHandler>
        </View>
      </Pressable>

      <View style={styles.minMaxRow}>
        <Text style={styles.minMaxText}>{min}</Text>
        <Text style={styles.minMaxText}>{max}</Text>
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      width: "100%",
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    headerRow: {
      marginBottom: theme.spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    headerLabel: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      flex: 1,
    },
    headerValue: {
      color: theme.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.medium,
    },
    track: {
      position: "relative",
      height: 8,
      borderRadius: theme.rounded.full,
      width: "100%",
      justifyContent: "center",
      overflow: "visible",
      backgroundColor: theme.borderSoft,
    },
    trackDisabled: {
      opacity: 0.5,
    },
    fill: {
      position: "absolute",
      left: 0,
      height: 8,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.primary,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    thumb: {
      position: "absolute",
      width: THUMB_RADIUS * 2,
      height: THUMB_RADIUS * 2,
      borderRadius: THUMB_RADIUS,
      top: -(THUMB_RADIUS - 4),
      backgroundColor: theme.surfaceElevated,
      borderWidth: 2,
      borderColor: theme.primary,
      elevation: 3,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.22 : 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    thumbDisabled: {
      borderColor: theme.disabled.border,
      backgroundColor: theme.disabled.background,
    },
    minMaxRow: {
      marginTop: theme.spacing.xs,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    minMaxText: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
  });

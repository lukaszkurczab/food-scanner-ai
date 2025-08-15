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
  }, [value, trackW, min, max]);

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
    trackPx: number
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

  const header = useMemo(
    () => (
      <View style={styles.headerRow}>
        {!!label && (
          <Text
            style={{
              color: theme.text,
              fontFamily: theme.typography.fontFamily.bold,
              fontSize: theme.typography.size.md,
            }}
          >
            {label}
          </Text>
        )}
        <Text style={{ color: theme.text, fontSize: theme.typography.size.md }}>
          {value[0]}–{value[1]}
        </Text>
      </View>
    ),
    [label, theme, value]
  );

  return (
    <View
      style={{
        width: "100%",
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.sm,
      }}
    >
      {header}

      <Pressable
        onLayout={onTrackLayout}
        onPress={onTrackPress}
        disabled={disabled}
        style={[styles.track, { backgroundColor: theme.border }]}
      >
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: theme.accentSecondary },
            fillStyle,
          ]}
        />

        <View style={styles.overlay}>
          <PanGestureHandler enabled={!disabled} onGestureEvent={onLeftGesture}>
            <Animated.View
              style={[
                styles.thumb,
                leftThumbStyle,
                {
                  backgroundColor: theme.accentSecondary,
                  shadowColor: theme.shadow,
                },
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
                {
                  backgroundColor: theme.accentSecondary,
                  shadowColor: theme.shadow,
                },
              ]}
            />
          </PanGestureHandler>
        </View>
      </Pressable>

      <View style={styles.minMaxRow}>
        <Text style={{ color: theme.textSecondary }}>{min}</Text>
        <Text style={{ color: theme.textSecondary }}>{max}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  track: {
    position: "relative",
    height: 8,
    borderRadius: 999,
    width: "100%",
    justifyContent: "center",
    overflow: "visible",
  },
  fill: {
    position: "absolute",
    left: 0,
    height: 8,
    borderRadius: 999,
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
    elevation: 2,
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  minMaxRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

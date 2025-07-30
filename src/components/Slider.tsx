import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, LayoutChangeEvent } from "react-native";
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

type SliderProps = {
  value: number;
  onValueChange: (val: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
};

type ContextType = { startX: number };

export function Slider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  disabled = false,
}: SliderProps) {
  const [trackWidth, setTrackWidth] = useState(1);
  const trackWidthAnim = useSharedValue(1);
  const thumbX = useSharedValue(0);

  useEffect(() => {
    if (!trackWidth) return;
    const ratio = (value - minimumValue) / (maximumValue - minimumValue);
    const px = Math.max(0, Math.min(trackWidth, ratio * trackWidth));
    thumbX.value = withTiming(px);
  }, [value, trackWidth, minimumValue, maximumValue]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - 12 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    ContextType
  >({
    onStart: (_, ctx) => {
      ctx.startX = thumbX.value;
    },
    onActive: (event, ctx) => {
      if (disabled) return;
      let x = ctx.startX + event.translationX;
      x = Math.max(0, Math.min(trackWidthAnim.value, x));
      thumbX.value = x;
      let ratio = x / trackWidthAnim.value;
      ratio = Math.max(0, Math.min(1, ratio));
      let val = minimumValue + ratio * (maximumValue - minimumValue);
      val = Math.round(val / step) * step;
      val = Math.max(minimumValue, Math.min(maximumValue, val));
      runOnJS(onValueChange)(val);
    },
  });

  const handleTrackPress = (evt: { nativeEvent: { locationX: number } }) => {
    if (disabled || !trackWidth) return;
    const x = evt.nativeEvent.locationX;
    let ratio = x / trackWidth;
    ratio = Math.max(0, Math.min(1, ratio));
    let val = minimumValue + ratio * (maximumValue - minimumValue);
    val = Math.round(val / step) * step;
    val = Math.max(minimumValue, Math.min(maximumValue, val));
    thumbX.value = withTiming(x);
    onValueChange(val);
  };

  const onTrackLayout = (evt: LayoutChangeEvent) => {
    const w = evt.nativeEvent.layout.width;
    setTrackWidth(w);
    trackWidthAnim.value = w;
    const ratio = (value - minimumValue) / (maximumValue - minimumValue);
    thumbX.value = withTiming(Math.max(0, Math.min(w, ratio * w)));
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.track}
        onPress={handleTrackPress}
        onLayout={onTrackLayout}
        disabled={disabled}
      >
        <Animated.View style={[styles.filled, fillStyle]} />
        <View style={styles.trackOverlay}>
          <PanGestureHandler
            enabled={!disabled}
            onGestureEvent={gestureHandler}
          >
            <Animated.View
              style={[
                styles.thumb,
                thumbStyle,
                {
                  backgroundColor: disabled ? "#ccc" : "#fff",
                  borderColor: disabled ? "#aaa" : "#4CAF50",
                },
              ]}
              pointerEvents={disabled ? "none" : "auto"}
            />
          </PanGestureHandler>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", height: 40, justifyContent: "center" },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#eee",
    overflow: "visible",
    width: "100%",
    justifyContent: "center",
  },
  filled: {
    position: "absolute",
    height: 6,
    borderRadius: 3,
    left: 0,
    top: 0,
    backgroundColor: "#4CAF50",
  },
  trackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  thumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    top: -9,
    borderWidth: 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
});

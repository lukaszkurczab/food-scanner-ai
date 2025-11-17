import React, { useEffect, useState } from "react";
import { ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";

export type ElementId =
  | "title"
  | "kcal"
  | "custom"
  | "pie"
  | "line"
  | "bar"
  | "macros"
  | "photo";

type Props = {
  id: ElementId;
  areaX: number;
  areaY: number;
  areaW: number;
  areaH: number;
  initialXRatio?: number | null;
  initialYRatio?: number | null;
  initialScale?: number | null;
  initialRotation?: number | null;
  selected?: boolean;
  onSelect?: (id: ElementId) => void;
  onTap?: () => void;
  onUpdate?: (
    xRatio: number,
    yRatio: number,
    scale: number,
    rotation: number
  ) => void;
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function DraggableItem({
  id,
  areaX,
  areaY,
  areaW,
  areaH,
  initialXRatio = 0.5,
  initialYRatio = 0.5,
  initialScale = 1,
  initialRotation = 0,
  selected = false,
  onSelect,
  onTap,
  onUpdate,
  children,
  style,
}: Props) {
  const xRatio = useSharedValue(
    Number.isFinite(initialXRatio as number) ? (initialXRatio as number) : 0.5
  );
  const yRatio = useSharedValue(
    Number.isFinite(initialYRatio as number) ? (initialYRatio as number) : 0.5
  );
  const scale = useSharedValue(
    Number.isFinite(initialScale as number) ? (initialScale as number) : 1
  );
  const rotation = useSharedValue(
    Number.isFinite(initialRotation as number) ? (initialRotation as number) : 0
  );

  const offsetX = useSharedValue(xRatio.value);
  const offsetY = useSharedValue(yRatio.value);
  const savedScale = useSharedValue(scale.value);
  const savedRotation = useSharedValue(rotation.value);

  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const xr = Number.isFinite(initialXRatio as number)
      ? (initialXRatio as number)
      : 0.5;
    const yr = Number.isFinite(initialYRatio as number)
      ? (initialYRatio as number)
      : 0.5;
    const sc = Number.isFinite(initialScale as number)
      ? (initialScale as number)
      : 1;
    const rot = Number.isFinite(initialRotation as number)
      ? (initialRotation as number)
      : 0;
    xRatio.value = xr;
    yRatio.value = yr;
    scale.value = sc;
    rotation.value = rot;
    offsetX.value = xr;
    offsetY.value = yr;
    savedScale.value = sc;
    savedRotation.value = rot;
  }, [initialXRatio, initialYRatio, initialScale, initialRotation]);

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      offsetX.value = xRatio.value;
      offsetY.value = yRatio.value;
    })
    .onUpdate((e) => {
      const nx = offsetX.value + e.translationX / areaW;
      const ny = offsetY.value + e.translationY / areaH;
      const clampedX = Math.min(Math.max(nx, 0), 1);
      const clampedY = Math.min(Math.max(ny, 0), 1);
      xRatio.value = clampedX;
      yRatio.value = clampedY;
    })
    .onEnd(() => {
      offsetX.value = xRatio.value;
      offsetY.value = yRatio.value;
      if (onUpdate)
        runOnJS(onUpdate)(
          xRatio.value,
          yRatio.value,
          scale.value,
          rotation.value
        );
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = savedScale.value * (e.scale || 1);
      scale.value = Math.min(Math.max(next, 0.2), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (onUpdate)
        runOnJS(onUpdate)(
          xRatio.value,
          yRatio.value,
          scale.value,
          rotation.value
        );
    });

  const rotate = Gesture.Rotation()
    .onStart(() => {
      savedRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      const next = savedRotation.value + (e.rotation || 0);
      rotation.value = Number.isFinite(next) ? next : 0;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
      if (onUpdate)
        runOnJS(onUpdate)(
          xRatio.value,
          yRatio.value,
          scale.value,
          rotation.value
        );
    });

  const tap = Gesture.Tap().onEnd(() => {
    if (onSelect) runOnJS(onSelect)(id);
    if (onTap) runOnJS(onTap)();
  });

  const gesture = Gesture.Simultaneous(pan, pinch, rotate, tap);

  const styleOuter = useAnimatedStyle(() => {
    const xr = Math.min(Math.max(xRatio.value, 0), 1);
    const yr = Math.min(Math.max(yRatio.value, 0), 1);
    const cx = areaX + xr * areaW;
    const cy = areaY + yr * areaH;
    const left = cx - size.w / 2;
    const top = cy - size.h / 2;
    return {
      position: "absolute",
      left,
      top,
    } as any;
  });

  const styleInner = useAnimatedStyle(() => {
    const sc = Number.isFinite(scale.value) ? scale.value : 1;
    const rot = Number.isFinite(rotation.value) ? rotation.value : 0;
    return {
      transform: [{ scale: sc }, { rotate: `${rot}rad` }],
    } as any;
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={(e) =>
          setSize({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
        style={[styleOuter, selected ? { zIndex: 5 } : null]}
      >
        <Animated.View style={[styleInner, style]}>{children}</Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

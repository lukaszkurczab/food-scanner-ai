import React, { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

export type ElementId = "title" | "kcal" | "pie" | "custom" | "macros";

export type DraggableItemProps = {
  id: ElementId;
  canvasW: number;
  canvasH: number;
  initialXRatio: number;
  initialYRatio: number;
  initialScale: number;
  initialRotation: number; // degrees
  selected: boolean;
  onSelect: (id: ElementId) => void;
  onLongPress?: (id: ElementId) => void;
  onUpdate: (
    xRatio: number,
    yRatio: number,
    scale: number,
    rotation: number
  ) => void;
  children: React.ReactNode;
};

export function DraggableItem({
  id,
  canvasW,
  canvasH,
  initialXRatio,
  initialYRatio,
  initialScale,
  initialRotation,
  onSelect,
  onUpdate,
  onLongPress,
  children,
}: DraggableItemProps) {
  const cx = useSharedValue(initialXRatio * canvasW);
  const cy = useSharedValue(initialYRatio * canvasH);
  const scale = useSharedValue(initialScale);
  const rotation = useSharedValue(initialRotation);

  const w = useSharedValue(0);
  const h = useSharedValue(0);

  const startCX = useSharedValue(0);
  const startCY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRotation = useSharedValue(0);

  useEffect(() => {
    cx.value = withTiming(initialXRatio * canvasW);
    cy.value = withTiming(initialYRatio * canvasH);
    scale.value = withTiming(initialScale);
    rotation.value = withTiming(initialRotation);
  }, [
    canvasW,
    canvasH,
    initialXRatio,
    initialYRatio,
    initialScale,
    initialRotation,
  ]);

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onBegin(() => {
      startCX.value = cx.value;
      startCY.value = cy.value;
      runOnJS(onSelect)(id);
    })
    .onUpdate((e) => {
      cx.value = startCX.value + e.translationX;
      cy.value = startCY.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(onUpdate)(
        cx.value / canvasW,
        cy.value / canvasH,
        scale.value,
        rotation.value
      );
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
      runOnJS(onSelect)(id);
    })
    .onUpdate((e) => {
      scale.value = startScale.value * e.scale;
    })
    .onEnd(() => {
      runOnJS(onUpdate)(
        cx.value / canvasW,
        cy.value / canvasH,
        scale.value,
        rotation.value
      );
    });

  const rotateGesture = Gesture.Rotation()
    .onStart(() => {
      startRotation.value = rotation.value;
      runOnJS(onSelect)(id);
    })
    .onUpdate((e) => {
      rotation.value = startRotation.value + (e.rotation * 180) / Math.PI;
    })
    .onEnd(() => {
      runOnJS(onUpdate)(
        cx.value / canvasW,
        cy.value / canvasH,
        scale.value,
        rotation.value
      );
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      if (onLongPress) runOnJS(onLongPress)(id);
    });

  const baseGestures = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    rotateGesture
  );
  const combinedGesture = Gesture.Exclusive(longPressGesture, baseGestures);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: cx.value,
    top: cy.value,
    transform: [
      { translateX: -w.value / 2 },
      { translateY: -h.value / 2 },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View
        onLayout={(e) => {
          w.value = e.nativeEvent.layout.width;
          h.value = e.nativeEvent.layout.height;
        }}
        style={style}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

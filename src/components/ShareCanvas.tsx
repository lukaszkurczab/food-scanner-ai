import React, { useEffect } from "react";
import { View, Image, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { ShareOptions } from "@/types/share";

type Props = {
  width: number;
  height: number;
  photoUri: string | null;
  title: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  options: ShareOptions;
  onChange?: (next: ShareOptions) => void;
};

function clamp(n: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, n));
}

function normalize(px: number, total: number) {
  "worklet";
  if (total <= 0) return 0;
  return clamp(px / total, 0, 1);
}

function denormalize(ratio: number, total: number) {
  "worklet";
  return clamp(ratio, 0, 1) * total;
}

type DraggableProps = {
  canvasW: number;
  canvasH: number;
  initX: number; // ratio 0..1
  initY: number; // ratio 0..1
  initScale: number; // scalar
  minScale?: number;
  maxScale?: number;
  onUpdate: (xRatio: number, yRatio: number, scale: number) => void;
  children: (style: any) => React.ReactNode;
};

function DraggableResizable({
  canvasW,
  canvasH,
  initX,
  initY,
  initScale,
  minScale = 0.5,
  maxScale = 3,
  onUpdate,
  children,
}: DraggableProps) {
  const x = useSharedValue(denormalize(initX, canvasW));
  const y = useSharedValue(denormalize(initY, canvasH));
  const s = useSharedValue(initScale);

  useEffect(() => {
    x.value = withTiming(denormalize(initX, canvasW));
    y.value = withTiming(denormalize(initY, canvasH));
  }, [canvasW, canvasH, initX, initY]);

  const pan = Gesture.Pan()
    .onChange((e) => {
      x.value = clamp(x.value + e.changeX, 0, canvasW);
      y.value = clamp(y.value + e.changeY, 0, canvasH);
    })
    .onEnd(() => {
      const nx = normalize(x.value, canvasW);
      const ny = normalize(y.value, canvasH);
      runOnJS(onUpdate)(nx, ny, s.value);
    });

  const pinch = Gesture.Pinch()
    .onChange((e) => {
      const next = clamp(s.value * e.scale, minScale, maxScale);
      s.value = next;
    })
    .onEnd(() => {
      const nx = normalize(x.value, canvasW);
      const ny = normalize(y.value, canvasH);
      runOnJS(onUpdate)(nx, ny, s.value);
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: x.value,
    top: y.value,
    transform: [{ translateX: -0.5 }, { translateY: -0.5 }, { scale: s.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={style}>{children(style)}</Animated.View>
    </GestureDetector>
  );
}

export default function ShareCanvas({
  width,
  height,
  photoUri,
  title,
  kcal,
  protein,
  fat,
  carbs,
  options,
  onChange,
}: Props) {
  const apply = (patch: Partial<ShareOptions>) => {
    if (!onChange) return;
    onChange({ ...options, ...patch });
  };

  const onTitleUpdate = (x: number, y: number, scale: number) =>
    apply({ titleX: x, titleY: y, titleSize: Math.round(24 * scale) });

  const onKcalUpdate = (x: number, y: number, scale: number) =>
    apply({ kcalX: x, kcalY: y, kcalSize: Math.round(22 * scale) });

  const onPieUpdate = (x: number, y: number, scale: number) =>
    apply({ pieX: x, pieY: y, pieSize: clamp(scale, 0.2, 2) });

  const titleScale =
    options.titleSize && options.titleSize > 0 ? options.titleSize / 24 : 1;

  const kcalScale =
    options.kcalSize && options.kcalSize > 0 ? options.kcalSize / 22 : 1;

  const pieBase = Math.min(width, height) * 0.35 * (options.pieSize || 1);

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: "#111",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          resizeMode="cover"
        />
      ) : null}

      {options.filter === "bw" && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0,0,0,0.1)",
          }}
        />
      )}
      {options.filter === "sepia" && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(112, 66, 20, 0.12)",
          }}
        />
      )}

      {options.showTitle && (
        <DraggableResizable
          canvasW={width}
          canvasH={height}
          initX={options.titleX ?? 0.5}
          initY={options.titleY ?? 0.1}
          initScale={titleScale}
          minScale={0.5}
          maxScale={3}
          onUpdate={onTitleUpdate}
        >
          {() => (
            <Text
              numberOfLines={2}
              style={{
                color: "white",
                fontWeight: "700",
                fontSize: 24,
                textAlign: "center",
                textShadowColor: "rgba(0,0,0,0.35)",
                textShadowRadius: 6,
              }}
            >
              {title || "Meal"}
            </Text>
          )}
        </DraggableResizable>
      )}

      {options.showKcal && (
        <DraggableResizable
          canvasW={width}
          canvasH={height}
          initX={options.kcalX ?? 0.5}
          initY={options.kcalY ?? 0.2}
          initScale={kcalScale}
          minScale={0.5}
          maxScale={3}
          onUpdate={onKcalUpdate}
        >
          {() => (
            <Text
              style={{
                color: "white",
                fontWeight: "800",
                fontSize: 22,
                textAlign: "center",
                textShadowColor: "rgba(0,0,0,0.35)",
                textShadowRadius: 6,
              }}
            >
              {Math.round(kcal)} kcal
            </Text>
          )}
        </DraggableResizable>
      )}

      {options.showPie && (
        <DraggableResizable
          canvasW={width}
          canvasH={height}
          initX={options.pieX ?? 0.5}
          initY={options.pieY ?? 0.55}
          initScale={options.pieSize || 1}
          minScale={0.3}
          maxScale={2.5}
          onUpdate={onPieUpdate}
        >
          {() => (
            <View
              style={{
                width: pieBase,
                height: pieBase,
                borderRadius: pieBase / 2,
                backgroundColor: "rgba(0,0,0,0.35)",
                justifyContent: "center",
                alignItems: "center",
                padding: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>
                P {Math.round(protein)} • F {Math.round(fat)} • C{" "}
                {Math.round(carbs)}
              </Text>
            </View>
          )}
        </DraggableResizable>
      )}
    </View>
  );
}

const StyleSheet = {
  absoluteFillObject: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
};

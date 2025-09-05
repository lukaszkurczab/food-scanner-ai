import React, { useEffect, useMemo } from "react";
import { View, Image, Text, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTheme } from "@/theme/useTheme";
import { PieChart } from "@/components/PieChart";
import { cycleFilter, getFilterOverlay } from "@/utils/photoFilters";
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

type DragProps = {
  canvasW: number;
  canvasH: number;
  initX: number;
  initY: number;
  initScale: number;
  initRotation?: number;
  minScale?: number;
  maxScale?: number;
  onUpdate: (
    xRatio: number,
    yRatio: number,
    scale: number,
    rotationDeg: number
  ) => void;
  children: (scale: number, rotationDeg: number) => React.ReactNode;
};

function DraggableResizable({
  canvasW,
  canvasH,
  initX,
  initY,
  initScale,
  initRotation = 0,
  minScale = 0.5,
  maxScale = 3,
  onUpdate,
  children,
}: DragProps) {
  const x = useSharedValue(denormalize(initX, canvasW));
  const y = useSharedValue(denormalize(initY, canvasH));
  const s = useSharedValue(initScale);
  const r = useSharedValue(initRotation);

  useEffect(() => {
    x.value = withTiming(denormalize(initX, canvasW));
    y.value = withTiming(denormalize(initY, canvasH));
    r.value = withTiming(initRotation);
  }, [canvasW, canvasH, initX, initY, initRotation]);

  const pan = Gesture.Pan()
    .onChange((e) => {
      x.value = clamp(x.value + e.changeX, 0, canvasW);
      y.value = clamp(y.value + e.changeY, 0, canvasH);
    })
    .onEnd(() => {
      runOnJS(onUpdate)(
        normalize(x.value, canvasW),
        normalize(y.value, canvasH),
        s.value,
        r.value
      );
    });

  const pinch = Gesture.Pinch()
    .onChange((e) => {
      s.value = clamp(s.value * e.scale, minScale, maxScale);
    })
    .onEnd(() => {
      runOnJS(onUpdate)(
        normalize(x.value, canvasW),
        normalize(y.value, canvasH),
        s.value,
        r.value
      );
    });

  const rotate = Gesture.Rotation()
    .onChange((e) => {
      r.value += (e.rotation * 180) / Math.PI;
    })
    .onEnd(() => {
      runOnJS(onUpdate)(
        normalize(x.value, canvasW),
        normalize(y.value, canvasH),
        s.value,
        r.value
      );
    });

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: x.value,
    top: y.value,
    transform: [
      { translateX: -0.5 },
      { translateY: -0.5 },
      { scale: s.value },
      { rotate: `${r.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, pinch, rotate)}>
      <Animated.View style={style}>{children(s.value, r.value)}</Animated.View>
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
  const theme = useTheme();
  const apply = (patch: Partial<ShareOptions>) =>
    onChange?.({ ...options, ...patch });

  const applyFilter = (dir: "left" | "right") => {
    onChange?.({ ...options, filter: cycleFilter(options.filter, dir) });
  };

  const flinger = Gesture.Pan().onEnd((e) => {
    "worklet";
    const dx = e.translationX;
    const vx = e.velocityX;
    const threshold = 60;

    if (dx > threshold || vx > 800) {
      runOnJS(applyFilter)("left");
    } else if (dx < -threshold || vx < -800) {
      runOnJS(applyFilter)("right");
    }
  });

  const { overlayStyle } = getFilterOverlay(options.filter);

  const BASE_TITLE = 28;
  const BASE_KCAL = 22;

  const titleScale = options.titleSize / BASE_TITLE;
  const kcalScale = options.kcalSize / BASE_KCAL;

  const pieData = useMemo(
    () => [
      {
        value: Math.max(0, protein),
        color: theme.macro.protein,
        label: "Protein",
      },
      { value: Math.max(0, fat), color: theme.macro.fat, label: "Fat" },
      { value: Math.max(0, carbs), color: theme.macro.carbs, label: "Carbs" },
    ],
    [protein, fat, carbs, theme]
  );

  return (
    <GestureDetector gesture={flinger}>
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

        {overlayStyle ? (
          <View
            style={{ position: "absolute", inset: 0, ...(overlayStyle as any) }}
          />
        ) : null}

        {options.showTitle && (
          <DraggableResizable
            canvasW={width}
            canvasH={height}
            initX={options.titleX}
            initY={options.titleY}
            initScale={titleScale}
            initRotation={options.titleRotation}
            minScale={0.5}
            maxScale={3}
            onUpdate={(x, y, sc, rot) =>
              apply({
                titleX: x,
                titleY: y,
                titleSize: Math.round(BASE_TITLE * sc),
                titleRotation: rot,
              })
            }
          >
            {() => (
              <Text
                numberOfLines={2}
                style={{
                  color: "white",
                  fontWeight: "700",
                  fontSize: BASE_TITLE,
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
            initX={options.kcalX}
            initY={options.kcalY}
            initScale={kcalScale}
            initRotation={options.kcalRotation}
            minScale={0.5}
            maxScale={3}
            onUpdate={(x, y, sc, rot) =>
              apply({
                kcalX: x,
                kcalY: y,
                kcalSize: Math.round(BASE_KCAL * sc),
                kcalRotation: rot,
              })
            }
          >
            {() => (
              <Text
                style={{
                  color: "white",
                  fontWeight: "800",
                  fontSize: BASE_KCAL,
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
            initX={options.pieX}
            initY={options.pieY}
            initScale={options.pieSize}
            initRotation={options.pieRotation}
            minScale={0.4}
            maxScale={2.5}
            onUpdate={(x, y, sc, rot) =>
              apply({ pieX: x, pieY: y, pieSize: sc, pieRotation: rot })
            }
          >
            {(scale) => (
              <View style={{ width: 220 * scale, alignItems: "center" }}>
                <PieChart
                  data={pieData}
                  maxSize={180 * scale}
                  minSize={120 * scale}
                  legendWidth={120}
                  gap={12}
                  fontSize={14 * scale}
                />
              </View>
            )}
          </DraggableResizable>
        )}

        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: 4,
            borderRadius: 999,
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
        >
          <MenuButton onToggle={(patch) => apply(patch)} options={options} />
        </View>
      </View>
    </GestureDetector>
  );
}

function MenuButton({
  onToggle,
  options,
}: {
  onToggle: (patch: Partial<ShareOptions>) => void;
  options: ShareOptions;
}) {
  const [open, setOpen] = React.useState(false);
  const theme = useTheme();
  return (
    <View>
      <Pressable
        onPress={() => setOpen((s) => !s)}
        style={{
          width: 28,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "white",
            marginVertical: 1,
          }}
        />
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "white",
            marginVertical: 1,
          }}
        />
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "white",
            marginVertical: 1,
          }}
        />
      </Pressable>

      {open && (
        <View
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 10,
            padding: 10,
            gap: 8,
            minWidth: 160,
          }}
        >
          <MenuItem
            label={`${options.showTitle ? "✓" : "○"} Nazwa`}
            onPress={() => onToggle({ showTitle: !options.showTitle })}
          />
          <MenuItem
            label={`${options.showKcal ? "✓" : "○"} Kalorie`}
            onPress={() => onToggle({ showKcal: !options.showKcal })}
          />
          <MenuItem
            label={`${options.showPie ? "✓" : "○"} Makro`}
            onPress={() => onToggle({ showPie: !options.showPie })}
          />
        </View>
      )}
    </View>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingVertical: 6, paddingHorizontal: 8 }}
    >
      <Text style={{ color: "white", fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

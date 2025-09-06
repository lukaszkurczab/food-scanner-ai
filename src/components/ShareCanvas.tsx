import React, { useEffect, useState } from "react";
import { View, Image, Text, Pressable, StyleSheet } from "react-native";
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
import { Modal } from "@/components/Modal";
import { TextInput as StyledInput } from "@/components/TextInput";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ElementId = "title" | "kcal" | "pie";

type DraggableItemProps = {
  id: ElementId;
  canvasW: number;
  canvasH: number;
  initialXRatio: number;
  initialYRatio: number;
  initialScale: number;
  initialRotation: number;
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

function DraggableItem({
  id,
  canvasW,
  canvasH,
  initialXRatio,
  initialYRatio,
  initialScale,
  initialRotation,
  selected,
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
    borderWidth: selected ? 1 : 0,
    borderColor: "rgba(255,255,255,0.5)",
    borderStyle: "dashed",
    borderRadius: 8,
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

type ShareCanvasProps = {
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
  menuVisible?: boolean;
};

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
  menuVisible = true,
}: ShareCanvasProps) {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<ElementId | null>(null);
  const [styleTarget, setStyleTarget] = useState<ElementId | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState<string>("");

  useEffect(() => {
    // Load recent colors once when style modal is used
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("share.recentColors");
        if (raw) setRecentColors(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!menuVisible && menuOpen) setMenuOpen(false);
  }, [menuVisible, menuOpen]);

  const applyPatch = (patch: Partial<ShareOptions>) => {
    onChange?.({ ...options, ...patch });
  };

  const handleFilterSwipe = (dir: "left" | "right") => {
    applyPatch({ filter: cycleFilter(options.filter, dir) });
  };

  const filterSwipeGesture = Gesture.Pan()
    .maxPointers(1)
    .onEnd((e) => {
      const dx = e.translationX;
      const vx = e.velocityX;
      const threshold = 60;
      if (dx > threshold || vx > 800) {
        runOnJS(handleFilterSwipe)("left");
      } else if (dx < -threshold || vx < -800) {
        runOnJS(handleFilterSwipe)("right");
      }
    });

  const pieData = [
    {
      value: Math.max(0, protein),
      color: theme.macro.protein,
      label: "Protein",
    },
    { value: Math.max(0, fat), color: theme.macro.fat, label: "Fat" },
    { value: Math.max(0, carbs), color: theme.macro.carbs, label: "Carbs" },
  ];

  const { overlayStyle } = getFilterOverlay(options.filter);

  const baseQuickColors = [
    "#FFFFFF",
    String(theme.text),
    String(theme.accentSecondary),
  ].map((c) => c.toUpperCase());
  const uniqueQuickColors: string[] = [];
  {
    const seen = new Set<string>();
    for (const c of [
      ...baseQuickColors,
      ...recentColors.map((x) => x.toUpperCase()),
    ]) {
      if (!seen.has(c)) {
        seen.add(c);
        uniqueQuickColors.push(c);
      }
    }
  }

  const addRecentColor = async (hex: string) => {
    const HEX = hex.toUpperCase();
    if (baseQuickColors.includes(HEX)) return;
    const next = [
      HEX,
      ...recentColors.filter((x) => x.toUpperCase() !== HEX),
    ].slice(0, 8);
    setRecentColors(next);
    try {
      await AsyncStorage.setItem("share.recentColors", JSON.stringify(next));
    } catch {}
  };

  const parseColor = (input: string): string | null => {
    const str = input.trim();
    const hexMatch = str.match(/^#?([0-9a-fA-F]{6})$/);
    if (hexMatch) return `#${hexMatch[1].toUpperCase()}`;
    const rgbCall = str.match(
      /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
    );
    const rgbFlat = str.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
    const m = rgbCall || rgbFlat;
    if (m) {
      const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
      const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
      const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));
      const to2 = (v: number) => v.toString(16).padStart(2, "0");
      return `#${to2(r)}${to2(g)}${to2(b)}`.toUpperCase();
    }
    return null;
  };

  return (
    <GestureDetector gesture={filterSwipeGesture}>
      <View style={[styles.canvas, { width, height }]}>
        {photoUri && (
          <Image
            source={{ uri: photoUri }}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode="cover"
          />
        )}
        {overlayStyle && (
          <View
            style={{
              position: "absolute",
              inset: 0,
              ...(overlayStyle as object),
            }}
          />
        )}

        {options.showTitle && (
          <DraggableItem
            id="title"
            canvasW={width}
            canvasH={height}
            initialXRatio={options.titleX}
            initialYRatio={options.titleY}
            initialScale={options.titleSize / 28}
            initialRotation={options.titleRotation}
            selected={selectedId === "title"}
            onSelect={setSelectedId}
            onLongPress={(id) => {
              if (id === "title") {
                setStyleTarget("title");
                setStyleOpen(true);
              }
            }}
            onUpdate={(x, y, sc, rot) => {
              applyPatch({
                titleX: x,
                titleY: y,
                titleSize: Math.round(28 * sc),
                titleRotation: rot,
              });
            }}
          >
            <Text
              numberOfLines={2}
              style={{
                color: options.titleColor || "white",
                fontWeight:
                  options.titleWeight === "bold"
                    ? "bold"
                    : options.titleWeight === "medium"
                    ? "500"
                    : "400",
                fontSize: options.titleSize,
                textAlign: "center",
                textShadowColor: "rgba(0,0,0,0.35)",
                textShadowRadius: 6,
              }}
            >
              {title || "Meal"}
            </Text>
          </DraggableItem>
        )}

        {options.showKcal && (
          <DraggableItem
            id="kcal"
            canvasW={width}
            canvasH={height}
            initialXRatio={options.kcalX}
            initialYRatio={options.kcalY}
            initialScale={options.kcalSize / 22}
            initialRotation={options.kcalRotation}
            selected={selectedId === "kcal"}
            onSelect={setSelectedId}
            onLongPress={(id) => {
              if (id === "kcal") {
                setStyleTarget("kcal");
                setStyleOpen(true);
              }
            }}
            onUpdate={(x, y, sc, rot) => {
              applyPatch({
                kcalX: x,
                kcalY: y,
                kcalSize: Math.round(22 * sc),
                kcalRotation: rot,
              });
            }}
          >
            <Text
              style={{
                color: options.kcalColor || "white",
                fontWeight:
                  options.kcalWeight === "bold"
                    ? "bold"
                    : options.kcalWeight === "medium"
                    ? "500"
                    : "400",
                fontSize: options.kcalSize,
                textAlign: "center",
                textShadowColor: "rgba(0,0,0,0.35)",
                textShadowRadius: 6,
              }}
            >
              {Math.round(kcal)} kcal
            </Text>
          </DraggableItem>
        )}

        {options.showPie && (
          <DraggableItem
            id="pie"
            canvasW={width}
            canvasH={height}
            initialXRatio={options.pieX}
            initialYRatio={options.pieY}
            initialScale={options.pieSize}
            initialRotation={options.pieRotation}
            selected={selectedId === "pie"}
            onSelect={setSelectedId}
            onUpdate={(x, y, sc, rot) => {
              applyPatch({
                pieX: x,
                pieY: y,
                pieSize: sc,
                pieRotation: rot,
              });
            }}
          >
            <View style={styles.pieWrap}>
              <PieChart
                maxSize={180}
                minSize={120}
                legendWidth={120}
                gap={12}
                fontSize={14}
                data={pieData}
              />
            </View>
          </DraggableItem>
        )}

        {menuVisible && (
          <View style={styles.menuButtonContainer}>
            <Pressable
              onPress={() => setMenuOpen((open) => !open)}
              style={styles.menuToggle}
            >
              <View style={styles.menuDot} />
              <View style={styles.menuDot} />
              <View style={styles.menuDot} />
            </Pressable>
            {menuOpen && (
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
                <Pressable
                  onPress={() => applyPatch({ showTitle: !options.showTitle })}
                  style={{ paddingVertical: 6, paddingHorizontal: 8 }}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>
                    {options.showTitle ? "✓" : "○"} Title
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => applyPatch({ showKcal: !options.showKcal })}
                  style={{ paddingVertical: 6, paddingHorizontal: 8 }}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>
                    {options.showKcal ? "✓" : "○"} Calories
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => applyPatch({ showPie: !options.showPie })}
                  style={{ paddingVertical: 6, paddingHorizontal: 8 }}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>
                    {options.showPie ? "✓" : "○"} Macros
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        <Modal
          visible={styleOpen}
          title={styleTarget === "title" ? "Style title" : "Style calories"}
          onClose={() => setStyleOpen(false)}
        >
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["regular", "medium", "bold"] as const).map((w) => {
                const active =
                  styleTarget === "title"
                    ? (options.titleWeight || "bold") === w
                    : (options.kcalWeight || "bold") === w;
                return (
                  <Pressable
                    key={w}
                    onPress={() => {
                      if (styleTarget === "title")
                        applyPatch({ titleWeight: w });
                      else if (styleTarget === "kcal")
                        applyPatch({ kcalWeight: w });
                    }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: active
                        ? theme.accentSecondary
                        : theme.border,
                      backgroundColor: active ? theme.overlay : theme.card,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: theme.typography.size.md,
                        fontFamily:
                          w === "bold"
                            ? theme.typography.fontFamily.bold
                            : w === "medium"
                            ? theme.typography.fontFamily.medium
                            : theme.typography.fontFamily.regular,
                      }}
                    >
                      {w}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Text style={{ color: theme.text, width: 56 }}>Size</Text>
              <Pressable
                onPress={() => {
                  if (styleTarget === "title")
                    applyPatch({
                      titleSize: Math.max(12, (options.titleSize || 28) - 2),
                    });
                  else if (styleTarget === "kcal")
                    applyPatch({
                      kcalSize: Math.max(12, (options.kcalSize || 22) - 2),
                    });
                }}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ color: theme.text }}>-</Text>
              </Pressable>
              <Text style={{ color: theme.text }}>
                {styleTarget === "title" ? options.titleSize : options.kcalSize}
              </Text>
              <Pressable
                onPress={() => {
                  if (styleTarget === "title")
                    applyPatch({ titleSize: (options.titleSize || 28) + 2 });
                  else if (styleTarget === "kcal")
                    applyPatch({ kcalSize: (options.kcalSize || 22) + 2 });
                }}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ color: theme.text }}>+</Text>
              </Pressable>
            </View>

            <View style={{ gap: 10 }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: theme.typography.size.md,
                }}
              >
                Color
              </Text>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {uniqueQuickColors.slice(0, 8).map((hex, idx) => {
                  const current =
                    styleTarget === "title"
                      ? (options.titleColor || "#FFFFFF").toUpperCase()
                      : (options.kcalColor || "#FFFFFF").toUpperCase();
                  const active = current === hex;
                  return (
                    <Pressable
                      key={`sw-${idx}-${hex}`}
                      onPress={async () => {
                        if (styleTarget === "title")
                          applyPatch({ titleColor: hex });
                        else if (styleTarget === "kcal")
                          applyPatch({ kcalColor: hex });
                        await addRecentColor(hex);
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: hex,
                          borderWidth: 2,
                          borderColor: active
                            ? theme.accentSecondary
                            : theme.border,
                        }}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View
                style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
              >
                <View style={{ flex: 1 }}>
                  <StyledInput
                    placeholder="#RRGGBB or R,G,B"
                    value={customColor}
                    onChangeText={setCustomColor}
                    autoCapitalize="none"
                    keyboardType="default"
                    maxLength={18}
                  />
                </View>
                <Pressable
                  onPress={async () => {
                    const parsed = parseColor(customColor);
                    if (!parsed) return;
                    if (styleTarget === "title")
                      applyPatch({ titleColor: parsed });
                    else if (styleTarget === "kcal")
                      applyPatch({ kcalColor: parsed });
                    const next = [
                      parsed,
                      ...recentColors.filter(
                        (x) => x.toUpperCase() !== parsed.toUpperCase()
                      ),
                    ].slice(0, 8);
                    setRecentColors(next);
                    try {
                      await AsyncStorage.setItem(
                        "share.recentColors",
                        JSON.stringify(next)
                      );
                    } catch {}
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 8,
                    backgroundColor: theme.card,
                  }}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: theme.typography.size.md,
                    }}
                  >
                    Apply
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={{ height: 4 }} />
          </View>
        </Modal>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: { borderRadius: 16, overflow: "hidden" },
  pieWrap: { width: 220, alignItems: "center" },
  menuButtonContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  menuDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "white",
    marginVertical: 1,
  },
  menuToggle: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});

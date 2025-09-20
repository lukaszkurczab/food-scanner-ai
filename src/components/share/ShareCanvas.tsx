import React, { useEffect, useMemo, useState } from "react";
import { View, Image, Text, Pressable, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import { lightTheme, darkTheme } from "@/theme/themes";
import { PieChart } from "@/components/PieChart";
import { LineGraph } from "@/components/LineGraph";
import BarChart from "@/components/BarChart";
import { cycleFilter, getFilterOverlay } from "@/utils/photoFilters";
import type { ShareOptions, DataSeries } from "@/types/share";
import { DraggableItem, ElementId } from "./DraggableItem";
import { TextSticker } from "./TextSticker";
import { TextInput as StyledInput } from "@/components/TextInput";
import { useRecentColors } from "./useRecentColors";
import { parseColor } from "./colorUtils";
import MacroOverlay from "../MacroOverlay";

export type ShareCanvasProps = {
  width: number;
  height: number;
  photoUri: string | null;
  title: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  options: ShareOptions & {
    showMacroOverlay?: boolean;
    macroX?: number;
    macroY?: number;
    macroSize?: number;
    macroRotation?: number;
    macroVariant?: "chips" | "bars";
  };
  onChange?: (next: ShareOptions) => void;
  menuVisible?: boolean;
};

export function ShareCanvas({
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
  const themeSys = useTheme();
  const palette =
    options.themePreset === "light"
      ? lightTheme
      : options.themePreset === "dark"
      ? darkTheme
      : themeSys;

  const [menuOpen, setMenuOpen] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  useEffect(() => setPhotoError(false), [photoUri]);
  const [selectedId, setSelectedId] = useState<ElementId | "macros" | null>(
    null
  );
  type TextTarget = "title" | "kcal" | "custom";
  type EditorState =
    | { type: "chart" }
    | { type: "macros" }
    | { type: "theme" }
    | { type: "text"; target: TextTarget }
    | null;

  const [editor, setEditor] = useState<EditorState>(null);
  const [colorInput, setColorInput] = useState("");

  const panelTranslateY = useSharedValue(0);
  const panelStartY = useSharedValue(0);

  useEffect(() => {
    if (!menuVisible) {
      if (menuOpen) setMenuOpen(false);
      if (editor) setEditor(null);
    }
  }, [menuVisible, menuOpen, editor]);

  useEffect(() => {
    setColorInput("");
  }, [editor]);

  const applyPatch = (patch: Partial<ShareOptions>) =>
    onChange?.({ ...options, ...patch });

  const handleFilterSwipe = (dir: "left" | "right") =>
    applyPatch({ filter: cycleFilter(options.filter, dir) });

  const filterSwipeGesture = Gesture.Pan()
    .maxPointers(1)
    .onEnd((e) => {
      const dx = e.translationX;
      const vx = e.velocityX;
      const threshold = 60;
      if (dx > threshold || vx > 800) handleFilterSwipe("left");
      else if (dx < -threshold || vx < -800) handleFilterSwipe("right");
    });

  const series: DataSeries[] = Array.isArray(options.dataSeries)
    ? options.dataSeries
    : [];

  const merged = useMemo(() => {
    if (!series.length)
      return { labels: [] as string[], values: [] as number[] };
    const maxLen = Math.max(...series.map((s) => s.values.length));
    const values = Array.from({ length: maxLen }, (_, i) =>
      series.reduce((acc, s) => acc + (s.values[i] ?? 0), 0)
    );
    const labels = Array.from({ length: maxLen }, (_, i) => `${i + 1}`);
    return { labels, values };
  }, [series]);

  const pieData = useMemo(
    () => [
      {
        value: Math.max(0, protein),
        color: palette.macro.protein,
        label: "Protein",
      },
      { value: Math.max(0, fat), color: palette.macro.fat, label: "Fat" },
      { value: Math.max(0, carbs), color: palette.macro.carbs, label: "Carbs" },
    ],
    [protein, fat, carbs, palette]
  );

  const { overlayStyle } = getFilterOverlay(options.filter);

  const baseQuickColors = [
    "#FFFFFF",
    String(palette.text),
    String(palette.accentSecondary),
  ].map((c) => c.toUpperCase());
  const { uniqueQuickColors, addRecentColor } =
    useRecentColors(baseQuickColors);

  const chartType = options.chartType ?? "pie";
  const chartVisible =
    options.showChart ??
    (typeof options.showPie === "boolean" ? options.showPie : true);
  const macroLayout = options.macroLayout ?? "pie";
  const macroOverlayVisible = options.showMacroOverlay ?? true;
  const macrosUsingOverlay = macroLayout === "overlay";
  const showOverlay = macrosUsingOverlay && macroOverlayVisible;
  const showPieChart =
    chartVisible && chartType === "pie" && !macrosUsingOverlay;
  const showOtherChart =
    chartVisible && chartType !== "pie" && merged.values.length > 0;
  const lineColor = options.lineColor || String(palette.accentSecondary);
  const barColor = options.barColor || String(palette.accent);

  const openEditor = (next: EditorState) => {
    setEditor(next);
    setMenuOpen(false);
    panelTranslateY.value = 0;
    if (!next) {
      setSelectedId(null);
      return;
    }
    if (next.type === "chart") setSelectedId("pie");
    else if (next.type === "macros") setSelectedId("macros");
    else if (next.type === "text") setSelectedId(next.target);
    else setSelectedId(null);
  };

  const closeEditor = () => {
    setEditor(null);
    setSelectedId(null);
    setColorInput("");
  };

  const chartTogglePatch = (value: boolean) =>
    applyPatch({ showChart: value, showPie: value });

  const panelPanGesture = useMemo(() => {
    return Gesture.Pan()
      .onBegin(() => {
        panelStartY.value = panelTranslateY.value;
      })
      .onUpdate((event) => {
        const next = panelStartY.value + event.translationY;
        const availableLift = Math.max(0, height - 220);
        const minY = -availableLift;
        const clamped = Math.min(Math.max(next, minY), 0);
        panelTranslateY.value = clamped;
      });
  }, [height]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelTranslateY.value || 0 }],
  }));

  const getFontFamily = (key: "regular" | "medium" | "bold" | "light") => {
    const fonts = (palette as any)?.typography?.fontFamily;
    return fonts?.[key] || fonts?.regular;
  };

  const resolveTextState = (target: TextTarget) => {
    if (target === "title") {
      return {
        font: (options.titleFont || "bold") as
          | "regular"
          | "medium"
          | "bold"
          | "light",
        italic: !!options.titleItalic,
        underline: !!options.titleUnderline,
        color: options.titleColor || "#FFFFFF",
        text: title || "Meal",
      };
    }
    if (target === "kcal") {
      return {
        font: (options.kcalFont || "bold") as
          | "regular"
          | "medium"
          | "bold"
          | "light",
        italic: !!options.kcalItalic,
        underline: !!options.kcalUnderline,
        color: options.kcalColor || "#FFFFFF",
        text: `${Math.round(kcal)} kcal`,
      };
    }
    return {
      font: (options.customFont || "regular") as
        | "regular"
        | "medium"
        | "bold"
        | "light",
      italic: !!options.customItalic,
      underline: !!options.customUnderline,
      color: options.customColor || "#FFFFFF",
      text: options.customText || "Your text",
    };
  };

  const textTargetLabel = (target: TextTarget) =>
    target === "title" ? "Title" : target === "kcal" ? "Calories" : "Custom";

  const setTextFont = (
    target: TextTarget,
    font: "regular" | "medium" | "bold" | "light"
  ) => {
    if (target === "title") applyPatch({ titleFont: font });
    else if (target === "kcal") applyPatch({ kcalFont: font });
    else applyPatch({ customFont: font });
  };

  const toggleTextItalic = (target: TextTarget) => {
    if (target === "title") applyPatch({ titleItalic: !options.titleItalic });
    else if (target === "kcal") applyPatch({ kcalItalic: !options.kcalItalic });
    else applyPatch({ customItalic: !options.customItalic });
  };

  const toggleTextUnderline = (target: TextTarget) => {
    if (target === "title")
      applyPatch({ titleUnderline: !options.titleUnderline });
    else if (target === "kcal")
      applyPatch({ kcalUnderline: !options.kcalUnderline });
    else applyPatch({ customUnderline: !options.customUnderline });
  };

  const setTextColor = (target: TextTarget, hex: string) => {
    if (target === "title") applyPatch({ titleColor: hex });
    else if (target === "kcal") applyPatch({ kcalColor: hex });
    else applyPatch({ customColor: hex });
  };

  const OptionButton = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionButton,
        {
          borderColor: active ? palette.accentSecondary : palette.border,
          backgroundColor: active ? palette.overlay : palette.card,
        },
      ]}
    >
      <Text style={{ color: palette.text }}>{label}</Text>
    </Pressable>
  );

  const EditorPanel = () => {
    if (!editor || !menuVisible) return null;

    const sectionLabel = (text: string) => (
      <Text
        style={{
          color: palette.textSecondary || palette.text,
          opacity: 0.8,
          marginTop: 6,
          marginBottom: 4,
        }}
      >
        {text}
      </Text>
    );

    const headerLabel = (() => {
      if (!editor) return "";
      if (editor.type === "chart") return "Chart settings";
      if (editor.type === "macros") return "Macros settings";
      if (editor.type === "theme") return "Theme";
      if (editor.type === "text")
        return `${textTargetLabel(editor.target)} text`;
      return "";
    })();

    const renderTextEditor = (target: TextTarget) => {
      const state = resolveTextState(target);
      const fonts: Array<"regular" | "medium" | "bold" | "light"> = [
        "regular",
        "medium",
        "bold",
        "light",
      ];

      const handleColorPick = (hex: string) => {
        const upper = hex.toUpperCase();
        setTextColor(target, upper);
        void addRecentColor(upper);
      };

      const applyColorInput = () => {
        const parsed = parseColor(colorInput);
        if (!parsed) return;
        setColorInput("");
        const normalized = parsed.toUpperCase();
        setTextColor(target, normalized);
        void addRecentColor(normalized);
      };

      const isCustom = target === "custom";

      return (
        <View style={{ gap: 10 }}>
          {sectionLabel("Preview")}
          <View style={styles.textPreviewBox}>
            <Text
              style={{
                color: state.color,
                fontFamily: getFontFamily(state.font),
                fontStyle: state.italic ? "italic" : "normal",
                textDecorationLine: state.underline ? "underline" : "none",
                fontSize: target === "title" ? 24 : 20,
                textAlign: "center",
              }}
            >
              {state.text}
            </Text>
          </View>

          {sectionLabel("Font")}
          <View style={styles.optionRow}>
            {fonts.map((f) => (
              <OptionButton
                key={f}
                label={f.charAt(0).toUpperCase() + f.slice(1)}
                active={state.font === f}
                onPress={() => setTextFont(target, f)}
              />
            ))}
          </View>

          {sectionLabel("Style")}
          <View style={styles.optionRow}>
            <OptionButton
              label="Italic"
              active={state.italic}
              onPress={() => toggleTextItalic(target)}
            />
            <OptionButton
              label="Underline"
              active={state.underline}
              onPress={() => toggleTextUnderline(target)}
            />
          </View>

          {sectionLabel("Color")}
          <View style={styles.colorRow}>
            {uniqueQuickColors.slice(0, 8).map((hex, idx) => {
              const active = state.color?.toUpperCase() === hex;
              return (
                <Pressable
                  key={`sw-${idx}-${hex}`}
                  onPress={() => handleColorPick(hex)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: hex,
                      borderColor: active
                        ? palette.accentSecondary
                        : palette.border,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.colorInputRow}>
            <View style={{ flex: 1 }}>
              <StyledInput
                placeholder="#RRGGBB or R,G,B"
                value={colorInput}
                onChangeText={setColorInput}
                autoCapitalize="none"
                keyboardType="default"
                maxLength={18}
              />
            </View>
            <Pressable
              onPress={applyColorInput}
              style={[
                styles.applyButton,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                },
              ]}
            >
              <Text style={{ color: palette.text }}>Apply</Text>
            </Pressable>
          </View>

          {isCustom && (
            <View style={{ gap: 6 }}>
              {sectionLabel("Text")}
              <StyledInput
                placeholder="Enter text"
                value={options.customText || ""}
                onChangeText={(v) => applyPatch({ customText: v })}
              />
            </View>
          )}
        </View>
      );
    };

    return (
      <>
        <Pressable
          style={styles.editorBackdrop}
          onPress={closeEditor}
          accessibilityLabel="Close element editor"
        />
        <GestureDetector gesture={panelPanGesture}>
          <Animated.View
            style={[
              styles.editorContainer,
              panelStyle,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.editorHeader}>
              <Text style={{ color: palette.text, fontWeight: "700" }}>
                {headerLabel}
              </Text>
              <Pressable onPress={closeEditor}>
              <Text style={{ color: palette.text }}>✕</Text>
            </Pressable>
          </View>

          {editor.type === "chart" && (
            <View style={{ gap: 8 }}>
              {sectionLabel("Chart type")}
              <View style={styles.optionRow}>
                {(["pie", "bar", "line"] as const).map((t) => (
                  <OptionButton
                    key={t}
                    label={t.charAt(0).toUpperCase() + t.slice(1)}
                    active={chartType === t}
                    onPress={() => applyPatch({ chartType: t })}
                  />
                ))}
              </View>
              {chartType === "bar" && (
                <View style={{ gap: 6 }}>
                  {sectionLabel("Bar orientation")}
                  <View style={styles.optionRow}>
                    {(["vertical", "horizontal"] as const).map((o) => (
                      <OptionButton
                        key={o}
                        label={o.charAt(0).toUpperCase() + o.slice(1)}
                        active={(options.barOrientation ?? "vertical") === o}
                        onPress={() => applyPatch({ barOrientation: o })}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {editor.type === "macros" && (
            <View style={{ gap: 8 }}>
              {sectionLabel("Macros layout")}
              <View style={styles.optionRow}>
                {(["pie", "overlay"] as const).map((m) => (
                  <OptionButton
                    key={m}
                    label={m.charAt(0).toUpperCase() + m.slice(1)}
                    active={macroLayout === m}
                    onPress={() => applyPatch({ macroLayout: m })}
                  />
                ))}
              </View>
              {macroLayout === "overlay" && (
                <View style={{ gap: 6 }}>
                  {sectionLabel("Overlay variant")}
                  <View style={styles.optionRow}>
                    {(["chips", "bars"] as const).map((variant) => (
                      <OptionButton
                        key={variant}
                        label={
                          variant.charAt(0).toUpperCase() + variant.slice(1)
                        }
                        active={(options.macroVariant ?? "chips") === variant}
                        onPress={() => applyPatch({ macroVariant: variant })}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {editor.type === "theme" && (
            <View style={{ gap: 8 }}>
              {sectionLabel("Theme preset")}
              <View style={styles.optionRow}>
                {(["auto", "light", "dark"] as const).map((preset) => (
                  <OptionButton
                    key={preset}
                    label={preset.charAt(0).toUpperCase() + preset.slice(1)}
                    active={(options.themePreset ?? "auto") === preset}
                    onPress={() => applyPatch({ themePreset: preset })}
                  />
                ))}
              </View>
            </View>
          )}

          {editor.type === "text" && renderTextEditor(editor.target)}
          </Animated.View>
        </GestureDetector>
      </>
    );
  };

  return (
    <GestureDetector gesture={filterSwipeGesture}>
      <View
        style={[styles.canvas, { width, height }]}
        accessibilityLabel="Share canvas"
        accessibilityHint="Drag, pinch, rotate overlays; open menu to toggle elements"
      >
        {photoUri && !photoError && (
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            onError={() => setPhotoError(true)}
            accessibilityLabel={options.altText || title || "Meal photo"}
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
          <TextSticker
            id="title"
            canvasW={width}
            canvasH={height}
            options={options}
            titleText={title}
            kcalValue={kcal}
            onSelect={(id) => setSelectedId(id)}
            onOpenStyle={(id) => openEditor({ type: "text", target: id })}
            onPatch={applyPatch}
          />
        )}

        {options.showKcal && (
          <TextSticker
            id="kcal"
            canvasW={width}
            canvasH={height}
            options={options}
            titleText={title}
            kcalValue={kcal}
            onSelect={(id) => setSelectedId(id)}
            onOpenStyle={(id) => openEditor({ type: "text", target: id })}
            onPatch={applyPatch}
          />
        )}

        {options.showCustom && (
          <TextSticker
            id="custom"
            canvasW={width}
            canvasH={height}
            options={options}
            titleText={title}
            kcalValue={kcal}
            onSelect={(id) => setSelectedId(id)}
            onOpenStyle={(id) => openEditor({ type: "text", target: id })}
            onPatch={applyPatch}
          />
        )}

        {showPieChart && (
          <DraggableItem
            id={"pie"}
            canvasW={width}
            canvasH={height}
            initialXRatio={options.pieX}
            initialYRatio={options.pieY}
            initialScale={options.pieSize}
            initialRotation={options.pieRotation}
            selected={menuVisible && selectedId === "pie"}
            onSelect={(id) => setSelectedId(id)}
            onTap={() => openEditor({ type: "chart" })}
            onUpdate={(x, y, sc, rot) =>
              applyPatch({ pieX: x, pieY: y, pieSize: sc, pieRotation: rot })
            }
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

        {showOtherChart && merged.values.length > 0 && (
          <DraggableItem
            id={"pie"}
            canvasW={width}
            canvasH={height}
            initialXRatio={options.pieX}
            initialYRatio={options.pieY}
            initialScale={options.pieSize}
            initialRotation={options.pieRotation}
            selected={menuVisible && selectedId === "pie"}
            onSelect={(id) => setSelectedId(id)}
            onTap={() => openEditor({ type: "chart" })}
            onUpdate={(x, y, sc, rot) =>
              applyPatch({ pieX: x, pieY: y, pieSize: sc, pieRotation: rot })
            }
          >
            <View style={{ width: 240, maxWidth: 280 }}>
              {chartType === "line" ? (
                <LineGraph
                  labels={merged.labels}
                  data={merged.values}
                  color={lineColor}
                />
              ) : (
                <BarChart
                  labels={merged.labels}
                  data={merged.values}
                  barColor={barColor}
                  orientation={options.barOrientation || "vertical"}
                />
              )}
            </View>
          </DraggableItem>
        )}

        {showOverlay && (
          <DraggableItem
            id={"macros" as ElementId}
            canvasW={width}
            canvasH={height}
            initialXRatio={options.macroX ?? 0.5}
            initialYRatio={options.macroY ?? 0.85}
            initialScale={options.macroSize ?? 1}
            initialRotation={options.macroRotation ?? 0}
            selected={menuVisible && selectedId === "macros"}
            onSelect={() => setSelectedId("macros")}
            onTap={() => openEditor({ type: "macros" })}
            onUpdate={(x, y, sc, rot) =>
              applyPatch({
                macroX: x,
                macroY: y,
                macroSize: sc,
                macroRotation: rot,
              })
            }
          >
            <View style={{ padding: 4 }}>
              <MacroOverlay
                protein={protein}
                fat={fat}
                carbs={carbs}
                kcal={kcal}
                color={options.macroColor?.text}
                backgroundColor={options.macroColor?.background}
                variant={options.macroVariant || "chips"}
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
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                  gap: 8,
                  minWidth: 200,
                }}
              >
                <MenuItem
                  label="Title"
                  checked={!!options.showTitle}
                  onPress={() => applyPatch({ showTitle: !options.showTitle })}
                  color={String(palette.text)}
                />
                <MenuItem
                  label="Calories"
                  checked={!!options.showKcal}
                  onPress={() => applyPatch({ showKcal: !options.showKcal })}
                  color={String(palette.text)}
                />
                <MenuItem
                  label="Custom text"
                  checked={!!options.showCustom}
                  onPress={() =>
                    applyPatch({ showCustom: !options.showCustom })
                  }
                  color={String(palette.text)}
                />
                <MenuItem
                  label="Chart"
                  checked={chartVisible}
                  onPress={() => {
                    const next = !chartVisible;
                    chartTogglePatch(next);
                    if (!next && editor?.type === "chart") setEditor(null);
                  }}
                  color={String(palette.text)}
                />
                {macroLayout === "overlay" && (
                  <MenuItem
                    label="Macro overlay"
                    checked={macroOverlayVisible}
                    onPress={() => {
                      const next = !macroOverlayVisible;
                      applyPatch({ showMacroOverlay: next });
                      if (!next && editor?.type === "macros") setEditor(null);
                    }}
                    color={String(palette.text)}
                  />
                )}
              </View>
            )}
          </View>
        )}

        <EditorPanel />
      </View>
    </GestureDetector>
  );
}

function MenuItem({
  label,
  checked,
  onPress,
  color = "white",
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingVertical: 6, paddingHorizontal: 8 }}
    >
      <Text style={{ color, fontWeight: "600" }}>
        {checked ? "✓" : "○"} {label}
      </Text>
    </Pressable>
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
  editorBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  editorContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  editorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  colorInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  applyButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  textPreviewBox: {
    alignItems: "center",
    paddingVertical: 6,
  },
});

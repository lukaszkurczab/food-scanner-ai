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
import { FONT_MAP } from "@/utils/loadFonts.generated";
import { Dropdown } from "@/components/Dropdown";
import { useTranslation } from "react-i18next";

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
    titleFontFamily?: string;
    titleFontWeight?: number;
    kcalFontFamily?: string;
    kcalFontWeight?: number;
    customFontFamily?: string;
    customFontWeight?: number;
  };
  onChange?: (next: ShareOptions) => void;
  menuVisible?: boolean;
};

const FONT_KEYS = Object.keys(FONT_MAP);
const PARSED_FONTS = FONT_KEYS.map((k) => {
  const m = k.match(/-(\d{3})$/);
  const weight = m ? Number(m[1]) : 400;
  const family = k.replace(/-\d{3}$/, "");
  return { key: k, family, weight };
});
const FONT_FAMILIES = Array.from(new Set(PARSED_FONTS.map((f) => f.family)));
const FAMILY_WEIGHTS = (fam: string) =>
  Array.from(
    new Set(PARSED_FONTS.filter((f) => f.family === fam).map((f) => f.weight))
  ).sort((a, b) => a - b);
const fontKey = (fam?: string, w?: number) =>
  fam && w ? `${fam}-${w}` : undefined;
const hasFont = (fam?: string, w?: number) =>
  !!FONT_MAP[fontKey(fam, w) as string];

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
  const { t } = useTranslation(["share", "meals", "common"]);
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
        label: t("protein", { ns: "meals" }),
      },
      {
        value: Math.max(0, fat),
        color: palette.macro.fat,
        label: t("fat", { ns: "meals" }),
      },
      {
        value: Math.max(0, carbs),
        color: palette.macro.carbs,
        label: t("carbs", { ns: "meals" }),
      },
    ],
    [protein, fat, carbs, palette, t]
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
        font: options.titleFont || "bold",
        family: options.titleFontFamily,
        weight: options.titleFontWeight,
        italic: !!options.titleItalic,
        underline: !!options.titleUnderline,
        color: options.titleColor || "#FFFFFF",
        text: title || t("editor.default_title"),
      };
    }
    if (target === "kcal") {
      return {
        font: options.kcalFont || "bold",
        family: options.kcalFontFamily,
        weight: options.kcalFontWeight,
        italic: !!options.kcalItalic,
        underline: !!options.kcalUnderline,
        color: options.kcalColor || "#FFFFFF",
        text: `${Math.round(kcal)} ${t("kcal", { ns: "common" })}`,
      };
    }
    return {
      font: options.customFont || "regular",
      family: options.customFontFamily,
      weight: options.customFontWeight,
      italic: !!options.customItalic,
      underline: !!options.customUnderline,
      color: options.customColor || "#FFFFFF",
      text: options.customText || t("editor.default_custom_text"),
    };
  };

  const setTextFontFamily = (target: TextTarget, family?: string) => {
    if (!family) {
      if (target === "title") applyPatch({ titleFontFamily: undefined });
      else if (target === "kcal") applyPatch({ kcalFontFamily: undefined });
      else applyPatch({ customFontFamily: undefined });
      return;
    }
    const currentWeight =
      target === "title"
        ? options.titleFontWeight
        : target === "kcal"
        ? options.kcalFontWeight
        : options.customFontWeight;
    const weights = FAMILY_WEIGHTS(family);
    const nearestWeight =
      currentWeight && weights.includes(currentWeight)
        ? currentWeight
        : weights[0];
    if (target === "title")
      applyPatch({ titleFontFamily: family, titleFontWeight: nearestWeight });
    else if (target === "kcal")
      applyPatch({ kcalFontFamily: family, kcalFontWeight: nearestWeight });
    else
      applyPatch({ customFontFamily: family, customFontWeight: nearestWeight });
  };
  const setTextFontWeight = (target: TextTarget, weight?: number) => {
    if (target === "title") applyPatch({ titleFontWeight: weight });
    else if (target === "kcal") applyPatch({ kcalFontWeight: weight });
    else applyPatch({ customFontWeight: weight });
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

  const textTargetLabel = (target: TextTarget) =>
    target === "title"
      ? t("editor.target_title")
      : target === "kcal"
      ? t("editor.target_calories")
      : t("editor.target_custom");

  // Zmapowane klucze rodzin dla Stickerów (aby zmiana była widoczna na canvasie)
  const mappedOptions = useMemo(() => {
    const tKey = fontKey(options.titleFontFamily, options.titleFontWeight);
    const kKey = fontKey(options.kcalFontFamily, options.kcalFontWeight);
    const cKey = fontKey(options.customFontFamily, options.customFontWeight);
    return {
      ...options,
      // Te pola powinny zostać odczytane przez TextSticker (jeśli ma wsparcie)
      titleFontFamilyKey: tKey,
      kcalFontFamilyKey: kKey,
      customFontFamilyKey: cKey,
    } as any;
  }, [
    options,
    options.titleFontFamily,
    options.titleFontWeight,
    options.kcalFontFamily,
    options.kcalFontWeight,
    options.customFontFamily,
    options.customFontWeight,
  ]);

  const EditorPanel = () => {
    if (!editor || !menuVisible) return null;

    const sectionLabel = (text: string) => (
      <Text
        style={{
          color: palette.textSecondary,
          opacity: 0.8,
          marginVertical: 4,
        }}
      >
        {text}
      </Text>
    );

    const renderTextEditor = (target: TextTarget) => {
      const state = resolveTextState(target);
      const previewFontFamily = hasFont(state.family, state.weight)
        ? (fontKey(state.family, state.weight) as string)
        : getFontFamily(state.font as any);

      return (
        <View style={{ gap: 10 }}>
          {sectionLabel(t("editor.preview"))}
          <View style={styles.textPreviewBox}>
            <Text
              style={{
                color: state.color,
                fontFamily: previewFontFamily,
                fontStyle: state.italic ? "italic" : "normal",
                textDecorationLine: state.underline ? "underline" : "none",
                fontSize: target === "title" ? 24 : 20,
                textAlign: "center",
              }}
            >
              {state.text}
            </Text>
          </View>

          {sectionLabel(t("editor.family"))}
          <Dropdown
            value={state.family ?? null}
            options={[
              { label: t("editor.system_font"), value: null },
              ...FONT_FAMILIES.map((fam) => ({ label: fam, value: fam })),
            ]}
            onChange={(fam) => setTextFontFamily(target, fam || undefined)}
          />

          {state.family && (
            <>
              {sectionLabel(t("editor.weight"))}
              <Dropdown
                value={state.weight ? String(state.weight) : null}
                options={FAMILY_WEIGHTS(state.family).map((w) => ({
                  label: String(w),
                  value: String(w),
                }))}
                onChange={(val) =>
                  setTextFontWeight(target, val ? Number(val) : undefined)
                }
              />
            </>
          )}

          {sectionLabel(t("editor.style"))}
          <View style={styles.optionRow}>
            <Pressable onPress={() => toggleTextItalic(target)}>
              <Text style={{ color: palette.text }}>
                {t(
                  state.italic
                    ? "editor.italic_on"
                    : "editor.italic_off"
                )}
              </Text>
            </Pressable>
            <Pressable onPress={() => toggleTextUnderline(target)}>
              <Text style={{ color: palette.text }}>
                {t(
                  state.underline
                    ? "editor.underline_on"
                    : "editor.underline_off"
                )}
              </Text>
            </Pressable>
          </View>

          {sectionLabel(t("editor.color"))}
          <View style={styles.optionRow}>
            {uniqueQuickColors.map((hex) => (
              <Pressable
                key={hex}
                onPress={() => setTextColor(target, hex)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: hex,
                  borderWidth: state.color?.toUpperCase() === hex ? 2 : 1,
                  borderColor:
                    state.color?.toUpperCase() === hex
                      ? palette.accentSecondary
                      : palette.border,
                  marginRight: 6,
                }}
              />
            ))}
          </View>

          <StyledInput
            placeholder={t("editor.color_placeholder")}
            value={colorInput}
            onChangeText={setColorInput}
            onSubmitEditing={() => {
              const parsed = parseColor(colorInput);
              if (parsed) {
                setTextColor(target, parsed.toUpperCase());
                setColorInput("");
              }
            }}
          />
        </View>
      );
    };

    return (
      <GestureDetector gesture={panelPanGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            style={styles.editorBackdrop}
            onPress={closeEditor}
            accessibilityLabel={t("editor.close_editor_accessibility")}
          />
          <Animated.View
            style={[
              styles.editorContainer,
              panelStyle,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            {editor.type === "text" && renderTextEditor(editor.target)}
          </Animated.View>
        </View>
      </GestureDetector>
    );
  };

  return (
    <GestureDetector gesture={filterSwipeGesture}>
      <View style={[styles.canvas, { width, height }]}>
        {photoUri && !photoError && (
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            onError={() => setPhotoError(true)}
            accessibilityLabel={
              options.altText || title || t("editor.image_accessibility")
            }
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
            options={mappedOptions}
            titleText={title}
            kcalValue={kcal}
            onSelect={(id) => setSelectedId(id)}
            onOpenStyle={(id) => setEditor({ type: "text", target: id })}
            onPatch={applyPatch}
          />
        )}
        {options.showKcal && (
          <TextSticker
            id="kcal"
            canvasW={width}
            canvasH={height}
            options={mappedOptions}
            titleText={title}
            kcalValue={kcal}
            onSelect={(id) => setSelectedId(id)}
            onOpenStyle={(id) => setEditor({ type: "text", target: id })}
            onPatch={applyPatch}
          />
        )}
        {options.showCustom && (
          <TextSticker
            id="custom"
            canvasW={width}
            canvasH={height}
            options={mappedOptions}
            titleText={title}
            kcalValue={kcal}
            onSelect={(id) => setSelectedId(id)}
            onOpenStyle={(id) => setEditor({ type: "text", target: id })}
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
            onTap={() => setEditor({ type: "chart" })}
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

        {showOtherChart && (
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
            onTap={() => setEditor({ type: "chart" })}
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
            onTap={() => setEditor({ type: "macros" })}
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

        <EditorPanel />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: { borderRadius: 16, overflow: "hidden" },
  pieWrap: { width: 220, alignItems: "center" },
  editorBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
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
  optionRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  textPreviewBox: { alignItems: "center", paddingVertical: 6 },
});

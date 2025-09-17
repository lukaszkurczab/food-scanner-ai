import React, { useEffect, useMemo, useState } from "react";
import { View, Image, Text, Pressable, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTheme } from "@/theme/useTheme";
import { lightTheme, darkTheme } from "@/theme/themes";
import { PieChart } from "@/components/PieChart";
import { LineGraph } from "@/components/LineGraph";
import BarChart from "@/components/BarChart";
import { cycleFilter, getFilterOverlay } from "@/utils/photoFilters";
import type { ShareOptions, DataSeries } from "@/types/share";
import { DraggableItem, ElementId } from "./DraggableItem";
import { TextSticker } from "./TextSticker";
import { StyleModal, type StyleTarget } from "./StyleModal";
import { useRecentColors } from "./useRecentColors";
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
    // pozycjonowanie nakładki makro
    showMacroOverlay?: boolean; // zachowujemy zgodność z poprzednim promptem
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
  // themePreset: "auto" | "light" | "dark"
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
  const [styleTarget, setStyleTarget] = useState<StyleTarget | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);

  useEffect(() => {
    if (!menuVisible && menuOpen) setMenuOpen(false);
  }, [menuVisible, menuOpen]);

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

  // ---------- DANE WYKRESU ----------
  const series: DataSeries[] = Array.isArray(options.dataSeries)
    ? options.dataSeries
    : [];

  // Jeśli jest wiele serii, łączymy do jednej przez sumę punktów (prosty i bezpieczny fallback)
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

  // ---------- WYBÓR RENDERU ----------
  const chartType = options.chartType ?? "pie";
  const macroLayout = options.macroLayout ?? "pie";
  const showOverlay = macroLayout === "overlay";
  const showPieChart = chartType === "pie" && !showOverlay && !!options.showPie;
  const showOtherChart = chartType !== "pie";
  const lineColor = options.lineColor || String(palette.accentSecondary);
  const barColor = options.barColor || String(palette.accent);

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
            onOpenStyle={(id) => {
              setStyleTarget(id);
              setStyleOpen(true);
            }}
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
            onOpenStyle={(id) => {
              setStyleTarget(id);
              setStyleOpen(true);
            }}
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
            onOpenStyle={(id) => {
              setStyleTarget(id);
              setStyleOpen(true);
            }}
            onPatch={applyPatch}
          />
        )}

        {/* Wykres kołowy makro */}
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

        {/* Inne wykresy: line / bar */}
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

        {/* Nakładka makro na zdjęcie gdy macroLayout === "overlay" */}
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

        {/* MENU */}
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
                {/* widoczność elementów */}
                <MenuItem
                  label="Title"
                  checked={!!options.showTitle}
                  onPress={() => applyPatch({ showTitle: !options.showTitle })}
                />
                <MenuItem
                  label="Calories"
                  checked={!!options.showKcal}
                  onPress={() => applyPatch({ showKcal: !options.showKcal })}
                />
                <MenuItem
                  label="Custom text"
                  checked={!!options.showCustom}
                  onPress={() =>
                    applyPatch({ showCustom: !options.showCustom })
                  }
                />

                {/* wybór typu wykresu */}
                <Divider />
                <Label text="Chart type" />
                {(["pie", "bar", "line"] as const).map((t) => (
                  <MenuItem
                    key={t}
                    label={`${
                      t === "pie" ? "Pie" : t === "bar" ? "Bar" : "Line"
                    }`}
                    checked={(options.chartType ?? "pie") === t}
                    onPress={() => applyPatch({ chartType: t })}
                  />
                ))}

                {/* orientacja słupków gdy bar */}
                {chartType === "bar" && (
                  <>
                    <Label text="Bar orientation" />
                    {(["vertical", "horizontal"] as const).map((o) => (
                      <MenuItem
                        key={o}
                        label={o}
                        checked={(options.barOrientation ?? "vertical") === o}
                        onPress={() => applyPatch({ barOrientation: o })}
                      />
                    ))}
                  </>
                )}

                {/* layout makro */}
                <Divider />
                <Label text="Macros layout" />
                {(["pie", "overlay"] as const).map((m) => (
                  <MenuItem
                    key={m}
                    label={m}
                    checked={(options.macroLayout ?? "pie") === m}
                    onPress={() => applyPatch({ macroLayout: m })}
                  />
                ))}

                {/* kolorystyka wykresów */}
                <Divider />
                <Label text="Theme preset" />
                {(["auto", "light", "dark"] as const).map((p) => (
                  <MenuItem
                    key={p}
                    label={p}
                    checked={(options.themePreset ?? "auto") === p}
                    onPress={() => applyPatch({ themePreset: p })}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* MODAL STYLU TEKSTU */}
        <StyleModal
          visible={styleOpen}
          onClose={() => setStyleOpen(false)}
          target={styleTarget}
          previewText={options.customText || "Your text"}
          currentFont={
            (styleTarget === "title"
              ? options.titleFont || "bold"
              : styleTarget === "kcal"
              ? options.kcalFont || "bold"
              : options.customFont || "regular") as any
          }
          italic={
            styleTarget === "title"
              ? !!options.titleItalic
              : styleTarget === "kcal"
              ? !!options.kcalItalic
              : !!options.customItalic
          }
          underline={
            styleTarget === "title"
              ? !!options.titleUnderline
              : styleTarget === "kcal"
              ? !!options.kcalUnderline
              : !!options.customUnderline
          }
          color={
            (styleTarget === "title"
              ? options.titleColor
              : styleTarget === "kcal"
              ? options.kcalColor
              : options.customColor) || "#FFFFFF"
          }
          uniqueQuickColors={uniqueQuickColors}
          theme={palette}
          onChangeFont={(f) => {
            if (styleTarget === "title") applyPatch({ titleFont: f });
            else if (styleTarget === "kcal") applyPatch({ kcalFont: f });
            else if (styleTarget === "custom") applyPatch({ customFont: f });
          }}
          onToggleItalic={() => {
            if (styleTarget === "title")
              applyPatch({ titleItalic: !options.titleItalic });
            else if (styleTarget === "kcal")
              applyPatch({ kcalItalic: !options.kcalItalic });
            else if (styleTarget === "custom")
              applyPatch({ customItalic: !options.customItalic });
          }}
          onToggleUnderline={() => {
            if (styleTarget === "title")
              applyPatch({ titleUnderline: !options.titleUnderline });
            else if (styleTarget === "kcal")
              applyPatch({ kcalUnderline: !options.kcalUnderline });
            else if (styleTarget === "custom")
              applyPatch({ customUnderline: !options.customUnderline });
          }}
          onApplyColor={(hex) => {
            if (styleTarget === "title") applyPatch({ titleColor: hex });
            else if (styleTarget === "kcal") applyPatch({ kcalColor: hex });
            else if (styleTarget === "custom") applyPatch({ customColor: hex });
          }}
          addRecentColor={addRecentColor}
          customText={
            styleTarget === "custom" ? options.customText || "" : undefined
          }
          onChangeCustomText={
            styleTarget === "custom"
              ? (v) => applyPatch({ customText: v })
              : undefined
          }
        />
      </View>
    </GestureDetector>
  );
}

function MenuItem({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingVertical: 6, paddingHorizontal: 8 }}
    >
      <Text style={{ color: "white", fontWeight: "600" }}>
        {checked ? "✓" : "○"} {label}
      </Text>
    </Pressable>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Text style={{ color: "white", opacity: 0.7, marginTop: 2 }}>{text}</Text>
  );
}

function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: "rgba(255,255,255,0.15)",
        marginVertical: 4,
      }}
    />
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

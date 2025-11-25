import React, { useMemo, useState, useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { lightTheme, darkTheme } from "@/theme/themes";
import { getFilterOverlay } from "@/utils/photoFilters";
import TextSticker from "./TextSticker";
import DraggableItem, { ElementId } from "./DraggableItem";
import CardOverlay from "../components/CardOverlay";
import ChartOverlay from "../components/ChartOverlay";
import type {
  ChartVariant,
  CardVariant,
  ChartType,
  ShareOptions,
  CustomTextItem,
} from "@/types/share";

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
  uiHidden?: boolean;
  selectedId?: ElementId | null;
  onSelectElement?: (id: ElementId) => void;
  onTapTextElement?: (id: ElementId) => void;
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
  uiHidden,
  selectedId = null,
  onSelectElement,
  onTapTextElement,
}: Props) {
  const themeSys = useTheme();

  const palette =
    options.themePreset === "light"
      ? lightTheme
      : options.themePreset === "dark"
      ? darkTheme
      : themeSys;

  const [photoErr, setPhotoErr] = useState(false);
  useEffect(() => setPhotoErr(false), [photoUri]);

  const applyPatch = (p: Partial<ShareOptions>) => {
    if (!onChange) return;
    for (const key in p) {
      if ((p as any)[key] !== (options as any)[key]) {
        onChange({ ...options, ...p });
        return;
      }
    }
  };

  const chartType: ChartType = (options.chartType || "donut") as ChartType;
  const chartVariant: ChartVariant =
    options.chartVariant ??
    (chartType === "pie"
      ? "macroPieWithLegend"
      : chartType === "bar"
      ? "macroBarMini"
      : chartType === "polarArea"
      ? "macroPolarArea"
      : chartType === "radar"
      ? "macroRadar"
      : "macroDonut");

  const cardVariant: CardVariant = options.cardVariant ?? "macroSummaryCard";

  const { overlayStyle } = getFilterOverlay(options.filter);

  const handleTextTap = (id: ElementId) => {
    onSelectElement?.(id);
    onTapTextElement?.(id);
  };

  const customTexts: CustomTextItem[] = useMemo(() => {
    if (Array.isArray(options.customTexts) && options.customTexts.length > 0) {
      return options.customTexts;
    }

    if (
      options.showCustom &&
      typeof options.customText === "string" &&
      options.customText.trim().length > 0
    ) {
      return [
        {
          id: "custom:legacy",
          text: options.customText,
          x: options.customX ?? 0.5,
          y: options.customY ?? 0.42,
          size: options.customSize ?? 1,
          rotation: options.customRotation ?? 0,
          color: options.customColor,
          backgroundColor: options.customBackgroundColor,
          fontFamilyKey:
            options.customFontFamilyKey ?? options.textFontFamilyKey ?? null,
          fontWeight:
            options.customFontWeight ?? options.textFontWeight ?? "500",
          italic: options.customItalic,
          underline: options.customUnderline,
        },
      ];
    }

    return [];
  }, [
    options.customTexts,
    options.showCustom,
    options.customText,
    options.customX,
    options.customY,
    options.customSize,
    options.customRotation,
    options.customColor,
    options.customBackgroundColor,
    options.customFontFamilyKey,
    options.customFontWeight,
    options.textFontFamilyKey,
    options.textFontWeight,
    options.customItalic,
    options.customUnderline,
  ]);

  const cardTextColor =
    options.cardTextColor || options.macroColor?.text || String(palette.text);

  const cardBackgroundColor =
    options.cardBackgroundColor ||
    options.macroColor?.background ||
    "rgba(0,0,0,0.35)";

  const cardMacroProtein =
    options.cardMacroProteinColor || String(palette.macro.protein);
  const cardMacroCarbs =
    options.cardMacroCarbsColor || String(palette.macro.carbs);
  const cardMacroFat = options.cardMacroFatColor || String(palette.macro.fat);

  const cardFontFamilyKey = options.cardFontFamilyKey || null;
  const cardFontWeight = options.cardFontWeight || "500";
  const cardFontFamily =
    cardFontFamilyKey && cardFontWeight
      ? `${cardFontFamilyKey}-${cardFontWeight}`
      : undefined;

  const handlePatchCustom = (id: ElementId, patch: Partial<CustomTextItem>) => {
    if (!onChange) return;
    const next = customTexts.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    applyPatch({ customTexts: next });
  };

  return (
    <View
      style={[
        styles.root,
        {
          width,
          height,
          backgroundColor: options.bgColor || "#000000",
        },
      ]}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          overflow: "hidden",
        }}
      >
        {photoUri && !photoErr && (
          <DraggableItem
            id="photo"
            areaX={0}
            areaY={0}
            areaW={width}
            areaH={height}
            initialXRatio={options.photoX ?? 0.5}
            initialYRatio={options.photoY ?? 0.5}
            initialScale={options.photoScale ?? 1}
            initialRotation={options.photoRotation ?? 0}
            onUpdate={(x, y, sc, rot) =>
              applyPatch({
                photoX: x,
                photoY: y,
                photoScale: sc,
                photoRotation: rot,
              })
            }
          >
            <Image
              source={{ uri: photoUri }}
              style={{ width, height }}
              resizeMode="cover"
              onError={() => setPhotoErr(true)}
            />
          </DraggableItem>
        )}

        {overlayStyle && (
          <View style={[StyleSheet.absoluteFill, overlayStyle as any]} />
        )}

        {options.showTitle !== false && (
          <TextSticker
            id="title"
            areaX={0}
            areaY={0}
            areaW={width}
            areaH={height}
            options={options}
            titleText={options.titleText ?? title}
            selected={selectedId === "title"}
            onSelect={onSelectElement}
            onTap={handleTextTap}
            onPatch={applyPatch}
          />
        )}

        {options.showKcal !== false && (
          <TextSticker
            id="kcal"
            areaX={0}
            areaY={0}
            areaW={width}
            areaH={height}
            options={options}
            kcalValue={kcal}
            selected={selectedId === "kcal"}
            onSelect={onSelectElement}
            onTap={handleTextTap}
            onPatch={applyPatch}
          />
        )}

        {customTexts.map((ct) => (
          <TextSticker
            key={ct.id}
            id={ct.id as ElementId}
            areaX={0}
            areaY={0}
            areaW={width}
            areaH={height}
            options={options}
            selected={selectedId === ct.id}
            onSelect={onSelectElement}
            onTap={handleTextTap}
            customItem={ct}
            onPatchCustom={handlePatchCustom}
          />
        ))}

        {options.showChart && (
          <DraggableItem
            id="chart"
            areaX={0}
            areaY={0}
            areaW={width}
            areaH={height}
            initialXRatio={options.pieX ?? 0.85}
            initialYRatio={options.pieY ?? 0.18}
            initialScale={options.pieSize ?? 1}
            initialRotation={options.pieRotation ?? 0}
            selected={selectedId === "chart"}
            onSelect={onSelectElement}
            onTap={() => handleTextTap("chart")}
            onUpdate={(x, y, sc, rot) =>
              applyPatch({ pieX: x, pieY: y, pieSize: sc, pieRotation: rot })
            }
          >
            <ChartOverlay
              variant={chartVariant}
              protein={protein}
              fat={fat}
              carbs={carbs}
              kcal={kcal}
              palette={{
                text: options.chartTextColor || String(palette.text),
                macro: {
                  protein:
                    options.chartProteinColor ?? String(palette.macro.protein),
                  carbs: options.chartCarbsColor ?? String(palette.macro.carbs),
                  fat: options.chartFatColor ?? String(palette.macro.fat),
                },
                accent: String(palette.accent),
                accentSecondary: String(palette.accentSecondary),
              }}
              showKcalLabel={options.showChartKcalLabel !== false}
              showLegend={options.showChartLegend !== false}
              barColor={options.barColor}
              textColor={options.chartTextColor}
              fontFamily={
                options.chartFontFamilyKey && options.chartFontWeight
                  ? `${options.chartFontFamilyKey}-${options.chartFontWeight}`
                  : undefined
              }
              backgroundColor={options.chartBackgroundColor}
            />
          </DraggableItem>
        )}

        {options.showMacroOverlay && (
          <DraggableItem
            id="macros"
            areaX={0}
            areaY={0}
            areaW={width}
            areaH={height}
            initialXRatio={options.macroX ?? 0.5}
            initialYRatio={options.macroY ?? 0.85}
            initialScale={options.macroSize ?? 1}
            initialRotation={options.macroRotation ?? 0}
            selected={selectedId === "macros"}
            onSelect={onSelectElement}
            onTap={() => handleTextTap("macros")}
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
              <CardOverlay
                protein={protein}
                fat={fat}
                carbs={carbs}
                kcal={kcal}
                color={cardTextColor}
                backgroundColor={cardBackgroundColor}
                variant={cardVariant}
                showKcal={options.cardShowKcal !== false}
                showMacros={options.cardShowMacros !== false}
                macroColorsOverride={{
                  protein: cardMacroProtein,
                  carbs: cardMacroCarbs,
                  fat: cardMacroFat,
                }}
                fontFamily={cardFontFamily}
                fontWeight={cardFontWeight as any}
              />
            </View>
          </DraggableItem>
        )}
      </View>

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.9)",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "relative", overflow: "hidden" },
});

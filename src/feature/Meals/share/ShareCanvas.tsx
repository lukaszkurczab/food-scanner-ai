import React, { useMemo, useState, useEffect } from "react";
import { View, Image, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { lightTheme, darkTheme } from "@/theme/themes";
import { getFilterOverlay } from "@/utils/photoFilters";
import TextSticker from "./TextSticker";
import DraggableItem, { ElementId } from "./DraggableItem";
import CardOverlay from "../components/CardOverlay";
import ChartOverlay from "../components/ChartOverlay";
import { useTranslation } from "react-i18next";
import type { ChartVariant, CardVariant } from "@/types/share";

type Props = {
  width: number;
  height: number;
  photoUri: string | null;
  title: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  options: any;
  onChange?: (next: any) => void;
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
  selectedId = null,
  onSelectElement,
  onTapTextElement,
}: Props) {
  const themeSys = useTheme();
  const { t } = useTranslation(["meals"]);

  const palette =
    options.themePreset === "light"
      ? lightTheme
      : options.themePreset === "dark"
      ? darkTheme
      : themeSys;

  const [photoErr, setPhotoErr] = useState(false);
  useEffect(() => setPhotoErr(false), [photoUri]);

  const applyPatch = (p: any) => {
    if (!onChange) return;
    for (const key in p) {
      if (p[key] !== options[key]) {
        onChange({ ...options, ...p });
        return;
      }
    }
  };

  const chartType = options.chartType || "pie";
  const chartVariant: ChartVariant =
    options.chartVariant ??
    (chartType === "line"
      ? "macroLineMini"
      : chartType === "bar"
      ? "macroBarMini"
      : "macroPieWithLegend");

  const cardVariant: CardVariant = options.cardVariant ?? "macroSummaryCard";

  const { overlayStyle } = getFilterOverlay(options.filter);

  const handleTextTap = (id: ElementId) => {
    onSelectElement?.(id);
    onTapTextElement?.(id);
  };

  const customTexts = useMemo(() => {
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
  ]);

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
            titleText={title}
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

        {customTexts.map((ct: any) => (
          <DraggableItem
            key={ct.id}
            id={ct.id as ElementId}
            areaX={0}
            areaY={0}
            areaW={width}
            areaH={height}
            initialXRatio={ct.x ?? 0.5}
            initialYRatio={ct.y ?? 0.42}
            initialScale={ct.size ?? 1}
            initialRotation={ct.rotation ?? 0}
            selected={selectedId === ct.id}
            onSelect={onSelectElement}
            onTap={() => handleTextTap(ct.id as ElementId)}
            onUpdate={(x, y, sc, rot) => {
              if (!onChange) return;
              const next = customTexts.map((item: any) =>
                item.id === ct.id
                  ? { ...item, x, y, size: sc, rotation: rot }
                  : item
              );
              applyPatch({ customTexts: next });
            }}
          >
            <Text
              style={{
                color: options.customColor || "#FFFFFF",
                fontSize: 26,
                fontStyle: options.customItalic ? "italic" : "normal",
                textDecorationLine: options.customUnderline
                  ? "underline"
                  : "none",
                fontFamily: options.textFontFamily || undefined,
              }}
            >
              {ct.text}
            </Text>
          </DraggableItem>
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
                macro: {
                  protein: String(palette.macro.protein),
                  carbs: String(palette.macro.carbs),
                  fat: String(palette.macro.fat),
                },
                accent: String(palette.accent),
                accentSecondary: String(palette.accentSecondary),
              }}
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
                color={options.macroColor?.text}
                backgroundColor={options.macroColor?.background}
                variant={cardVariant}
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

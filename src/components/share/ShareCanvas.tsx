import React, { useMemo, useState, useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { lightTheme, darkTheme } from "@/theme/themes";
import { getFilterOverlay } from "@/utils/photoFilters";
import TextSticker from "./TextSticker";
import DraggableItem from "./DraggableItem";
import MacroOverlay from "../MacroOverlay";
import BarChart from "../BarChart";
import { LineGraph } from "../LineGraph";
import { PieChart } from "../PieChart";
import { useTranslation } from "react-i18next";

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
  uiHidden = false,
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

  const applyPatch = (p: any) => onChange?.({ ...options, ...p });

  const chartType = options.chartType || "pie";
  const showChart = options.showChart ?? true;

  const { overlayStyle } = getFilterOverlay(options.filter);

  const pieData = useMemo(
    () => [
      {
        value: Math.max(0, protein),
        color: palette.macro.protein,
        label: t("protein"),
      },
      { value: Math.max(0, fat), color: palette.macro.fat, label: t("fat") },
      {
        value: Math.max(0, carbs),
        color: palette.macro.carbs,
        label: t("carbs"),
      },
    ],
    [protein, fat, carbs, palette, t]
  );

  const aspectW = 9;
  const aspectH = 16;
  const containerRatio = width / height;
  const targetRatio = aspectW / aspectH;

  let frameW = width;
  let frameH = height;
  if (containerRatio > targetRatio) {
    frameH = height;
    frameW = Math.round(height * targetRatio);
  } else {
    frameW = width;
    frameH = Math.round(width * (aspectH / aspectW));
  }
  const frameX = Math.round((width - frameW) / 2);
  const frameY = Math.round((height - frameH) / 2);

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
          left: frameX,
          top: frameY,
          width: frameW,
          height: frameH,
          overflow: "hidden",
        }}
      >
        {photoUri && !photoErr && (
          <DraggableItem
            id="photo"
            areaX={0}
            areaY={0}
            areaW={frameW}
            areaH={frameH}
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
              style={{ width: frameW, height: frameH }}
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
            areaW={frameW}
            areaH={frameH}
            options={options}
            titleText={title}
            onPatch={applyPatch}
          />
        )}

        {options.showKcal !== false && (
          <TextSticker
            id="kcal"
            areaX={0}
            areaY={0}
            areaW={frameW}
            areaH={frameH}
            options={options}
            kcalValue={kcal}
            onPatch={applyPatch}
          />
        )}

        {options.showCustom && (
          <TextSticker
            id="custom"
            areaX={0}
            areaY={0}
            areaW={frameW}
            areaH={frameH}
            options={options}
            onPatch={applyPatch}
          />
        )}

        {showChart && chartType === "pie" && (
          <DraggableItem
            id="pie"
            areaX={0}
            areaY={0}
            areaW={frameW}
            areaH={frameH}
            initialXRatio={options.pieX ?? 0.85}
            initialYRatio={options.pieY ?? 0.18}
            initialScale={options.pieSize ?? 1}
            initialRotation={options.pieRotation ?? 0}
            onUpdate={(x, y, sc, rot) =>
              applyPatch({ pieX: x, pieY: y, pieSize: sc, pieRotation: rot })
            }
          >
            <View style={{ width: 220, alignItems: "center" }}>
              <PieChart
                maxSize={180}
                minSize={120}
                legendWidth={0}
                gap={8}
                fontSize={12}
                data={pieData}
              />
            </View>
          </DraggableItem>
        )}

        {showChart && chartType === "line" && (
          <DraggableItem
            id="line"
            areaX={0}
            areaY={0}
            areaW={frameW}
            areaH={frameH}
            initialXRatio={options.pieX ?? 0.85}
            initialYRatio={options.pieY ?? 0.18}
            initialScale={options.pieSize ?? 1}
            initialRotation={options.pieRotation ?? 0}
            onUpdate={(x, y, sc, rot) =>
              applyPatch({ pieX: x, pieY: y, pieSize: sc, pieRotation: rot })
            }
          >
            <View style={{ width: 260 }}>
              <LineGraph
                labels={["1", "2", "3", "4", "5"]}
                data={[1, 3, 2, 5, 4]}
                color={String(palette.accent)}
              />
            </View>
          </DraggableItem>
        )}

        {showChart && chartType === "bar" && (
          <DraggableItem
            id="bar"
            areaX={0}
            areaY={0}
            areaW={frameW}
            areaH={frameH}
            initialXRatio={options.pieX ?? 0.85}
            initialYRatio={options.pieY ?? 0.18}
            initialScale={options.pieSize ?? 1}
            initialRotation={options.pieRotation ?? 0}
            onUpdate={(x, y, sc, rot) =>
              applyPatch({ pieX: x, pieY: y, pieSize: sc, pieRotation: rot })
            }
          >
            <View style={{ width: 260 }}>
              <BarChart
                labels={["1", "2", "3", "4", "5"]}
                data={[2, 5, 3, 6, 4]}
                barColor={String(palette.accentSecondary)}
                orientation="vertical"
              />
            </View>
          </DraggableItem>
        )}

        {options.showMacroOverlay && (
          <DraggableItem
            id="macros"
            areaX={0}
            areaY={0}
            areaW={frameW}
            areaH={frameH}
            initialXRatio={options.macroX ?? 0.5}
            initialYRatio={options.macroY ?? 0.85}
            initialScale={options.macroSize ?? 1}
            initialRotation={options.macroRotation ?? 0}
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
      </View>

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: frameX,
          top: frameY,
          width: frameW,
          height: frameH,
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

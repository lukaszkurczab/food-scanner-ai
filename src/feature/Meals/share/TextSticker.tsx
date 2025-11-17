import React, { useMemo } from "react";
import { Text } from "react-native";
import DraggableItem, { ElementId } from "./DraggableItem";

type Props = {
  id: ElementId;
  areaX: number;
  areaY: number;
  areaW: number;
  areaH: number;
  options: any;
  titleText?: string;
  kcalValue?: number;
  selected?: boolean;
  onSelect?: (id: ElementId) => void;
  onTap?: (id: ElementId) => void;
  onPatch?: (patch: any) => void;
};

export default function TextSticker({
  id,
  areaX,
  areaY,
  areaW,
  areaH,
  options,
  titleText,
  kcalValue,
  selected = false,
  onSelect,
  onTap,
  onPatch,
}: Props) {
  const cfg = useMemo(() => {
    if (id === "title") {
      return {
        text: options.titleText ?? titleText ?? "",
        color: options.titleColor || "#FFFFFF",
        x: options.titleX ?? 0.5,
        y: options.titleY ?? 0.15,
        size: options.titleSize ?? 1,
        rot: options.titleRotation ?? 0,
        family: options.textFontFamily || undefined,
        italic: !!options.titleItalic,
        underline: !!options.titleUnderline,
      };
    }
    if (id === "kcal") {
      const defaultKcalText = `${Math.round(kcalValue || 0)} kcal`;
      return {
        text: options.kcalText ?? defaultKcalText,
        color: options.kcalColor || "#FFFFFF",
        x: options.kcalX ?? 0.5,
        y: options.kcalY ?? 0.28,
        size: options.kcalSize ?? 1,
        rot: options.kcalRotation ?? 0,
        family: options.textFontFamily || undefined,
        italic: !!options.kcalItalic,
        underline: !!options.kcalUnderline,
      };
    }
    return {
      text: options.customText || "",
      color: options.customColor || "#FFFFFF",
      x: options.customX ?? 0.5,
      y: options.customY ?? 0.42,
      size: options.customSize ?? 1,
      rot: options.customRotation ?? 0,
      family: options.textFontFamily || undefined,
      italic: !!options.customItalic,
      underline: !!options.customUnderline,
    };
  }, [id, options, titleText, kcalValue]);

  const onUpdate = (x: number, y: number, sc: number, rot: number) => {
    const patch: any = {};
    const key = id;
    patch[`${key}X`] = x;
    patch[`${key}Y`] = y;
    patch[`${key}Size`] = sc;
    patch[`${key}Rotation`] = rot;
    onPatch?.(patch);
  };

  return (
    <DraggableItem
      id={id}
      areaX={areaX}
      areaY={areaY}
      areaW={areaW}
      areaH={areaH}
      initialXRatio={cfg.x}
      initialYRatio={cfg.y}
      initialScale={cfg.size}
      initialRotation={cfg.rot}
      selected={selected}
      onSelect={onSelect}
      onTap={() => onTap?.(id)}
      onUpdate={onUpdate}
    >
      <Text
        style={{
          color: cfg.color,
          fontSize: 26,
          fontStyle: cfg.italic ? "italic" : "normal",
          textDecorationLine: cfg.underline ? "underline" : "none",
          fontFamily: cfg.family,
        }}
      >
        {cfg.text}
      </Text>
    </DraggableItem>
  );
}

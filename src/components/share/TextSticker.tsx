import React from "react";
import { Text } from "react-native";
import { DraggableItem, ElementId } from "./DraggableItem";
import { useTheme } from "@/theme/useTheme";
import type { ShareOptions } from "@/types/share";

function themeFont(theme: any, key: "regular" | "medium" | "bold" | "light") {
  return (
    theme?.typography?.fontFamily?.[key] ||
    theme?.typography?.fontFamily?.regular
  );
}

type Props = {
  id: Extract<ElementId, "title" | "kcal" | "custom">;
  canvasW: number;
  canvasH: number;
  options: ShareOptions & {
    titleFontFamilyKey?: string;
    kcalFontFamilyKey?: string;
    customFontFamilyKey?: string;
  };
  titleText: string;
  kcalValue: number;
  onSelect: (id: ElementId) => void;
  onOpenStyle: (id: Extract<ElementId, "title" | "kcal" | "custom">) => void;
  onPatch: (patch: Partial<ShareOptions>) => void;
};

export function TextSticker({
  id,
  canvasW,
  canvasH,
  options,
  titleText,
  kcalValue,
  onSelect,
  onOpenStyle,
  onPatch,
}: Props) {
  const theme = useTheme();

  const cfg = {
    title: {
      x: options.titleX,
      y: options.titleY,
      size: options.titleSize,
      rotation: options.titleRotation,
      color: options.titleColor || "white",
      font: (options.titleFont || "bold") as
        | "regular"
        | "medium"
        | "bold"
        | "light",
      italic: !!options.titleItalic,
      underline: !!options.titleUnderline,
      base: 28,
      text: titleText || "Meal",
      familyKey: options.titleFontFamilyKey,
    },
    kcal: {
      x: options.kcalX,
      y: options.kcalY,
      size: options.kcalSize,
      rotation: options.kcalRotation,
      color: options.kcalColor || "white",
      font: (options.kcalFont || "bold") as
        | "regular"
        | "medium"
        | "bold"
        | "light",
      italic: !!options.kcalItalic,
      underline: !!options.kcalUnderline,
      base: 22,
      text: `${Math.round(kcalValue)} kcal`,
      familyKey: options.kcalFontFamilyKey,
    },
    custom: {
      x: options.customX ?? 0.5,
      y: options.customY ?? 0.2,
      size: options.customSize ?? 18,
      rotation: options.customRotation ?? 0,
      color: options.customColor || "white",
      font: (options.customFont || "regular") as
        | "regular"
        | "medium"
        | "bold"
        | "light",
      italic: !!options.customItalic,
      underline: !!options.customUnderline,
      base: 22,
      text: options.customText || "Your text",
      familyKey: options.customFontFamilyKey,
    },
  }[id];

  const resolvedFamily =
    cfg.familyKey && typeof cfg.familyKey === "string"
      ? cfg.familyKey
      : themeFont(theme, cfg.font);

  return (
    <DraggableItem
      id={id}
      canvasW={canvasW}
      canvasH={canvasH}
      initialXRatio={cfg.x}
      initialYRatio={cfg.y}
      initialScale={cfg.size / cfg.base}
      initialRotation={cfg.rotation}
      selected={false}
      onSelect={onSelect}
      onTap={() => onOpenStyle(id)}
      onUpdate={(x, y, sc, rot) => {
        if (id === "title")
          onPatch({
            titleX: x,
            titleY: y,
            titleSize: Math.round(cfg.base * sc),
            titleRotation: rot,
          });
        if (id === "kcal")
          onPatch({
            kcalX: x,
            kcalY: y,
            kcalSize: Math.round(cfg.base * sc),
            kcalRotation: rot,
          });
        if (id === "custom")
          onPatch({
            customX: x,
            customY: y,
            customSize: Math.round(cfg.base * sc),
            customRotation: rot,
          });
      }}
    >
      <Text
        numberOfLines={id === "title" ? 2 : 1}
        style={{
          color: cfg.color,
          fontFamily: resolvedFamily,
          fontStyle: cfg.italic ? "italic" : "normal",
          textDecorationLine: cfg.underline ? "underline" : "none",
          textAlign: "center",
          textShadowColor: "rgba(0,0,0,0.35)",
          textShadowRadius: 6,
        }}
      >
        {cfg.text}
      </Text>
    </DraggableItem>
  );
}

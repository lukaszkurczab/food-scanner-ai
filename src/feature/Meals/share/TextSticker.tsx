import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import DraggableItem, { ElementId } from "./DraggableItem";
import type { ShareOptions, ShareFont, CustomTextItem } from "@/types/share";

type Props = {
  id: ElementId;
  areaX: number;
  areaY: number;
  areaW: number;
  areaH: number;
  options: ShareOptions;
  titleText?: string;
  kcalValue?: number;
  selected?: boolean;
  onSelect?: (id: ElementId) => void;
  onTap?: (id: ElementId) => void;
  onPatch?: (patch: Partial<ShareOptions>) => void;
  customItem?: CustomTextItem | null;
  onPatchCustom?: (id: ElementId, patch: Partial<CustomTextItem>) => void;
};

function buildFamily(
  key: string | null | undefined,
  weight: ShareFont | null | undefined
) {
  if (!key || !weight) return undefined;
  return `${key}-${weight}`;
}

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
  customItem,
  onPatchCustom,
}: Props) {
  const isTitle = id === "title";
  const isKcal = id === "kcal";
  const isCustomItem = !isTitle && !isKcal && !!customItem;

  const cfg = useMemo(() => {
    if (isTitle) {
      const family = buildFamily(
        options.titleFontFamilyKey ?? options.textFontFamilyKey ?? null,
        options.titleFontWeight ?? options.textFontWeight ?? "500"
      );

      return {
        text: options.titleText ?? titleText ?? "",
        color: options.titleColor || "#FFFFFF",
        bgColor: options.titleBackgroundColor || "transparent",
        x: options.titleX ?? 0.5,
        y: options.titleY ?? 0.15,
        size: options.titleSize ?? 1,
        rot: options.titleRotation ?? 0,
        family,
        italic: !!options.titleItalic,
        underline: !!options.titleUnderline,
      };
    }

    if (isKcal) {
      const defaultKcalText = `${Math.round(kcalValue || 0)} kcal`;
      const family = buildFamily(
        options.kcalFontFamilyKey ?? options.textFontFamilyKey ?? null,
        options.kcalFontWeight ?? options.textFontWeight ?? "500"
      );

      return {
        text: options.kcalText ?? defaultKcalText,
        color: options.kcalColor || "#FFFFFF",
        bgColor: options.kcalBackgroundColor || "transparent",
        x: options.kcalX ?? 0.5,
        y: options.kcalY ?? 0.28,
        size: options.kcalSize ?? 1,
        rot: options.kcalRotation ?? 0,
        family,
        italic: !!options.kcalItalic,
        underline: !!options.kcalUnderline,
      };
    }

    if (isCustomItem && customItem) {
      const familyKey =
        customItem.fontFamilyKey ??
        options.customFontFamilyKey ??
        options.textFontFamilyKey ??
        null;
      const weight =
        customItem.fontWeight ??
        options.customFontWeight ??
        options.textFontWeight ??
        "500";

      const family = buildFamily(familyKey, weight);

      return {
        text: customItem.text ?? "",
        color: customItem.color || options.customColor || "#FFFFFF",
        bgColor:
          customItem.backgroundColor ||
          options.customBackgroundColor ||
          "transparent",
        x: customItem.x ?? 0.5,
        y: customItem.y ?? 0.42,
        size: customItem.size ?? 1,
        rot: customItem.rotation ?? 0,
        family,
        italic: !!customItem.italic,
        underline: !!customItem.underline,
      };
    }

    // fallback „global custom” (gdy nie ma jeszcze customItem)
    const family = buildFamily(
      options.customFontFamilyKey ?? options.textFontFamilyKey ?? null,
      options.customFontWeight ?? options.textFontWeight ?? "500"
    );

    return {
      text: options.customText || "",
      color: options.customColor || "#FFFFFF",
      bgColor: options.customBackgroundColor || "transparent",
      x: options.customX ?? 0.5,
      y: options.customY ?? 0.42,
      size: options.customSize ?? 1,
      rot: options.customRotation ?? 0,
      family,
      italic: !!options.customItalic,
      underline: !!options.customUnderline,
    };
  }, [
    isTitle,
    isKcal,
    isCustomItem,
    customItem,
    options,
    titleText,
    kcalValue,
  ]);

  const handleUpdate = (x: number, y: number, sc: number, rot: number) => {
    if (isCustomItem && customItem && onPatchCustom) {
      onPatchCustom(id, {
        x,
        y,
        size: sc,
        rotation: rot,
      });
      return;
    }

    if (id === "title") {
      onPatch?.({
        titleX: x,
        titleY: y,
        titleSize: sc,
        titleRotation: rot,
      });
      return;
    }

    if (id === "kcal") {
      onPatch?.({
        kcalX: x,
        kcalY: y,
        kcalSize: sc,
        kcalRotation: rot,
      });
      return;
    }

    onPatch?.({
      customX: x,
      customY: y,
      customSize: sc,
      customRotation: rot,
    });
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
      onUpdate={handleUpdate}
    >
      <View
        style={[
          styles.wrap,
          {
            backgroundColor: cfg.bgColor,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: cfg.color,
              fontStyle: cfg.italic ? "italic" : "normal",
              textDecorationLine: cfg.underline ? "underline" : "none",
              fontFamily: cfg.family,
            },
          ]}
        >
          {cfg.text}
        </Text>
      </View>
    </DraggableItem>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 26,
  },
});

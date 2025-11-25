import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { TextInput } from "@/components/TextInput";
import { Dropdown } from "@/components/Dropdown";
import ColorPickerPanel from "../ColorPickerPanel";
import type { ElementId } from "../DraggableItem";
import type { ShareOptions, ShareFont, CustomTextItem } from "@/types/share";

type FontFamilyOption = {
  label: string;
  value: string | null;
  previewFamily?: string;
};

type FontWeightOption = {
  label: string;
  value: ShareFont;
};

type ColorTarget =
  | "titleColor"
  | "kcalColor"
  | "customColor"
  | "titleBackgroundColor"
  | "kcalBackgroundColor"
  | "customBackgroundColor";

type Props = {
  options: ShareOptions;
  selectedId: ElementId | null;
  onChange: (next: ShareOptions) => void;
  onTapTextElement?: (id: ElementId) => void;
  onColorPickingChange?: (isPicking: boolean) => void;
};

export default function TextEditorPanel({
  options,
  selectedId,
  onChange,
  onTapTextElement,
  onColorPickingChange,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["share", "common"]);
  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [tempColor, setTempColor] = useState<string | null>(null);

  const patch = (p: Partial<ShareOptions>) => {
    let changed = false;
    for (const key in p) {
      if ((p as any)[key] !== (options as any)[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    onChange({ ...options, ...p });
  };

  const customTexts: CustomTextItem[] = Array.isArray(options.customTexts)
    ? options.customTexts
    : [];

  const findCustomItem = (): CustomTextItem | null => {
    if (!selectedId) return null;
    return customTexts.find((ct) => ct.id === selectedId) ?? null;
  };

  const customItem = findCustomItem();

  const resolveActiveText = () => {
    if (selectedId === "title") {
      return {
        key: "titleText" as const,
        label: t("editor.title", "Title"),
        placeholder: t("editor.title_placeholder", "Meal title"),
        value: options.titleText ?? "",
      };
    }
    if (selectedId === "kcal") {
      return {
        key: "kcalText" as const,
        label: t("editor.kcal", "Calories"),
        placeholder: t(
          "editor.kcal_placeholder",
          "Calories text, e.g. 550 kcal"
        ),
        value: options.kcalText ?? "",
      };
    }

    if (customItem) {
      return {
        key: "customText" as const,
        label: t("editor.custom", "Custom text"),
        placeholder: t("editor.custom_placeholder", "Your custom caption"),
        value: customItem.text ?? "",
      };
    }

    return {
      key: "customText" as const,
      label: t("editor.custom", "Custom text"),
      placeholder: t("editor.custom_placeholder", "Your custom caption"),
      value: options.customText ?? "",
    };
  };

  const activeText = resolveActiveText();

  const isTitle = selectedId === "title";
  const isKcal = selectedId === "kcal";
  const isCustom = !isTitle && !isKcal;

  const textColorPreview = isTitle
    ? options.titleColor || String(theme.text)
    : isKcal
    ? options.kcalColor || String(theme.text)
    : customItem?.color || options.customColor || String(theme.text);

  const bgColorPreview = isTitle
    ? options.titleBackgroundColor || "transparent"
    : isKcal
    ? options.kcalBackgroundColor || "transparent"
    : customItem?.backgroundColor ||
      options.customBackgroundColor ||
      "transparent";

  const currentFamilyKey: string | null = (() => {
    if (isTitle) {
      return options.titleFontFamilyKey ?? options.textFontFamilyKey ?? null;
    }
    if (isKcal) {
      return options.kcalFontFamilyKey ?? options.textFontFamilyKey ?? null;
    }
    if (customItem) {
      return (
        customItem.fontFamilyKey ??
        options.customFontFamilyKey ??
        options.textFontFamilyKey ??
        null
      );
    }
    return options.customFontFamilyKey ?? options.textFontFamilyKey ?? null;
  })();

  const currentWeight: ShareFont = (() => {
    if (isTitle) {
      return options.titleFontWeight ?? options.textFontWeight ?? "500";
    }
    if (isKcal) {
      return options.kcalFontWeight ?? options.textFontWeight ?? "500";
    }
    if (customItem) {
      return (
        customItem.fontWeight ??
        options.customFontWeight ??
        options.textFontWeight ??
        "500"
      );
    }
    return options.customFontWeight ?? options.textFontWeight ?? "500";
  })();

  const fontFamilyOptions: FontFamilyOption[] = [
    {
      label: t("editor.system_font", "System"),
      value: null,
      previewFamily: undefined,
    },
    { label: "DMSans", value: "DMSans", previewFamily: "DMSans-500" },
    { label: "Inter", value: "Inter", previewFamily: "Inter-500" },
    { label: "Lato", value: "Lato", previewFamily: "Lato-500" },
    { label: "Manrope", value: "Manrope", previewFamily: "Manrope-400" },
    {
      label: "Merriweather",
      value: "Merriweather",
      previewFamily: "Merriweather-400",
    },
    {
      label: "Montserrat",
      value: "Montserrat",
      previewFamily: "Montserrat-400",
    },
    { label: "Nunito", value: "Nunito", previewFamily: "Nunito-400" },
    { label: "Open Sans", value: "OpenSans", previewFamily: "OpenSans-400" },
    { label: "Oswald", value: "Oswald", previewFamily: "Oswald-500" },
    { label: "Poppins", value: "Poppins", previewFamily: "Poppins-500" },
    { label: "Raleway", value: "Raleway", previewFamily: "Raleway-400" },
    { label: "Roboto", value: "Roboto", previewFamily: "Roboto-500" },
    { label: "Rubik", value: "Rubik", previewFamily: "Rubik-500" },
    { label: "Ubuntu", value: "Ubuntu", previewFamily: "Ubuntu-500" },
    { label: "Work Sans", value: "WorkSans", previewFamily: "WorkSans-500" },
  ];

  const fontWeightOptions: FontWeightOption[] = [
    {
      label: t("editor.font.light", "Light"),
      value: "300",
    },
    {
      label: t("editor.font.regular", "Regular"),
      value: "500",
    },
    {
      label: t("editor.font.bold", "Bold"),
      value: "700",
    },
  ];

  const startColorPicking = () => {
    onColorPickingChange?.(true);
  };

  const stopColorPicking = () => {
    onColorPickingChange?.(false);
  };

  const openColorPickerText = () => {
    const target: ColorTarget = isTitle
      ? "titleColor"
      : isKcal
      ? "kcalColor"
      : "customColor";
    setColorTarget(target);
    setTempColor(textColorPreview);
    startColorPicking();
  };

  const openColorPickerBg = () => {
    const target: ColorTarget = isTitle
      ? "titleBackgroundColor"
      : isKcal
      ? "kcalBackgroundColor"
      : "customBackgroundColor";
    setColorTarget(target);
    setTempColor(bgColorPreview);
    startColorPicking();
  };

  const confirmColor = () => {
    if (!colorTarget || !tempColor) {
      setColorTarget(null);
      setTempColor(null);
      stopColorPicking();
      return;
    }

    if (colorTarget === "titleColor") {
      patch({ titleColor: tempColor });
    } else if (colorTarget === "kcalColor") {
      patch({ kcalColor: tempColor });
    } else if (colorTarget === "titleBackgroundColor") {
      patch({ titleBackgroundColor: tempColor });
    } else if (colorTarget === "kcalBackgroundColor") {
      patch({ kcalBackgroundColor: tempColor });
    } else if (colorTarget === "customColor") {
      if (customItem && selectedId) {
        const next = customTexts.map((ct) =>
          ct.id === selectedId ? { ...ct, color: tempColor } : ct
        );
        patch({ customTexts: next });
      } else {
        patch({ customColor: tempColor });
      }
    } else if (colorTarget === "customBackgroundColor") {
      if (customItem && selectedId) {
        const next = customTexts.map((ct) =>
          ct.id === selectedId ? { ...ct, backgroundColor: tempColor } : ct
        );
        patch({ customTexts: next });
      } else {
        patch({ customBackgroundColor: tempColor });
      }
    }

    setColorTarget(null);
    setTempColor(null);
    stopColorPicking();
  };

  const cancelColor = () => {
    setColorTarget(null);
    setTempColor(null);
    stopColorPicking();
  };

  if (colorTarget) {
    const isBg =
      colorTarget === "titleBackgroundColor" ||
      colorTarget === "kcalBackgroundColor" ||
      colorTarget === "customBackgroundColor";

    const label = isBg
      ? t("editor.text_bg_color", "Background color")
      : t("editor.chart_text_color", "Text color");

    let base: string;
    if (colorTarget === "titleColor") {
      base = options.titleColor || String(theme.text);
    } else if (colorTarget === "kcalColor") {
      base = options.kcalColor || String(theme.text);
    } else if (colorTarget === "customColor") {
      base = customItem?.color || options.customColor || String(theme.text);
    } else if (colorTarget === "titleBackgroundColor") {
      base = options.titleBackgroundColor || "transparent";
    } else if (colorTarget === "kcalBackgroundColor") {
      base = options.kcalBackgroundColor || "transparent";
    } else {
      base =
        customItem?.backgroundColor ||
        options.customBackgroundColor ||
        "transparent";
    }

    const value = tempColor ?? base;

    return (
      <View>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </Text>
        <ColorPickerPanel value={value} onChange={setTempColor} />
        <View style={styles.colorActions}>
          <Pressable
            onPress={cancelColor}
            style={[styles.button, { backgroundColor: theme.background }]}
          >
            <Text style={{ color: theme.text, fontSize: 14 }}>
              {t("common:back", "Back")}
            </Text>
          </Pressable>
          <Pressable
            onPress={confirmColor}
            style={[styles.button, { backgroundColor: theme.accentSecondary }]}
          >
            <Text style={{ color: theme.onAccent, fontSize: 14 }}>
              {t("common:confirm", "Confirm")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {t("editor.editing", "Editing")}{" "}
        {selectedId === "title"
          ? t("editor.title", "Title")
          : selectedId === "kcal"
          ? t("editor.kcal", "Calories")
          : t("editor.custom", "Custom text")}
      </Text>
      <TextInput
        value={activeText.value}
        placeholder={activeText.placeholder}
        onChangeText={(txt) => {
          if (selectedId === "title" || selectedId === "kcal") {
            patch({ [activeText.key]: txt } as Partial<ShareOptions>);
            return;
          }

          const id = selectedId as string | null;
          if (!id) {
            patch({ customText: txt });
            return;
          }

          const list = Array.isArray(options.customTexts)
            ? [...options.customTexts]
            : [];

          const idx = list.findIndex((ct) => ct.id === id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], text: txt };
          } else {
            list.push({
              id,
              text: txt,
              x: 0.5,
              y: 0.42,
              size: 1,
              rotation: 0,
            });
          }

          onChange({ ...options, customTexts: list });
        }}
      />

      <View style={{ height: 16 }} />
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {t("editor.font_family", "Font family")}
      </Text>
      <Dropdown
        value={currentFamilyKey}
        options={fontFamilyOptions}
        renderLabel={(opt) => {
          const o = opt as FontFamilyOption;
          return (
            <Text
              style={{
                fontFamily:
                  o.previewFamily || theme.typography.fontFamily.regular,
                fontSize: 14,
                color: theme.text,
              }}
              numberOfLines={1}
            >
              {o.label}
            </Text>
          );
        }}
        onChange={(fam) => {
          const famKey = fam || null;

          if (isTitle) {
            patch({ titleFontFamilyKey: famKey });
            return;
          }
          if (isKcal) {
            patch({ kcalFontFamilyKey: famKey });
            return;
          }

          if (customItem && selectedId) {
            const next = customTexts.map((ct) =>
              ct.id === selectedId ? { ...ct, fontFamilyKey: famKey } : ct
            );
            patch({ customTexts: next });
          } else {
            patch({ customFontFamilyKey: famKey });
          }
        }}
      />

      <View style={{ height: 16 }} />
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {t("editor.weight", "Weight")}
      </Text>
      <Dropdown
        value={currentWeight}
        options={fontWeightOptions}
        renderLabel={(opt) => {
          const o = opt as FontWeightOption;
          const previewFamily =
            currentFamilyKey && o.value
              ? `${currentFamilyKey}-${o.value}`
              : undefined;
          return (
            <Text
              style={{
                fontFamily:
                  previewFamily || theme.typography.fontFamily.regular,
                fontSize: 14,
                color: theme.text,
              }}
              numberOfLines={1}
            >
              {o.label}
            </Text>
          );
        }}
        onChange={(w) => {
          const weight = (w as ShareFont) || "500";

          if (isTitle) {
            patch({ titleFontWeight: weight });
            return;
          }
          if (isKcal) {
            patch({ kcalFontWeight: weight });
            return;
          }

          if (customItem && selectedId) {
            const next = customTexts.map((ct) =>
              ct.id === selectedId ? { ...ct, fontWeight: weight } : ct
            );
            patch({ customTexts: next });
          } else {
            patch({ customFontWeight: weight });
          }
        }}
      />

      <View style={{ height: 16 }} />
      <Pressable style={styles.colorRow} onPress={openColorPickerText}>
        <Text style={{ color: theme.text, fontSize: 14 }}>
          {t("editor.chart_text_color", "Text color")}
        </Text>
        <View
          style={[
            styles.colorPreview,
            {
              backgroundColor: textColorPreview,
            },
          ]}
        />
      </Pressable>

      <Pressable style={styles.colorRow} onPress={openColorPickerBg}>
        <Text style={{ color: theme.text, fontSize: 14 }}>
          {t("editor.text_bg_color", "Background color")}
        </Text>
        <View
          style={[
            styles.colorPreview,
            {
              backgroundColor: bgColorPreview,
            },
          ]}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16 },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  colorActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
});

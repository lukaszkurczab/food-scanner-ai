import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { TextInput } from "@/components/TextInput";
import { Dropdown } from "@/components/Dropdown";
import ColorPickerPanel from "../ColorPickerPanel";
import type { ElementId } from "../DraggableItem";
import type { ShareOptions } from "@/types/share";

type FontFamilyOption = {
  label: string;
  value: string | null;
  previewFamily?: string;
};

type FontWeightOption = {
  label: string;
  value: "300" | "500" | "700";
};

type ColorTarget = "customColor";

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

  const customTexts = Array.isArray(options.customTexts)
    ? options.customTexts
    : [];

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

    if (selectedId) {
      const item = customTexts.find((ct: any) => ct.id === selectedId) ?? null;
      return {
        key: "customText" as const,
        label: t("editor.custom", "Custom text"),
        placeholder: t("editor.custom_placeholder", "Your custom caption"),
        value: item?.text ?? "",
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

  const currentFamilyKey: string | null = options.textFontFamilyKey ?? null;
  const currentWeight: "300" | "500" | "700" =
    (options.textFontWeight as "300" | "500" | "700") ?? "500";

  const openColorPicker = () => {
    const current = options.customColor || String(theme.text);
    setColorTarget("customColor");
    setTempColor(current);
    onColorPickingChange?.(true);
  };

  const confirmColor = () => {
    if (!colorTarget || !tempColor) {
      setColorTarget(null);
      setTempColor(null);
      onColorPickingChange?.(false);
      return;
    }
    patch({ customColor: tempColor });
    setColorTarget(null);
    setTempColor(null);
    onColorPickingChange?.(false);
  };

  const cancelColor = () => {
    setColorTarget(null);
    setTempColor(null);
    onColorPickingChange?.(false);
  };

  if (colorTarget) {
    const value = tempColor || options.customColor || String(theme.text);

    return (
      <View>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.chart_text_color", "Text color")}
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
          if (!id) return;

          const list = Array.isArray(options.customTexts)
            ? [...options.customTexts]
            : [];

          const idx = list.findIndex((ct: any) => ct.id === id);
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
          patch({
            textFontFamilyKey: famKey,
          });
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
          const weight = (w as "300" | "500" | "700") || "500";
          patch({
            textFontWeight: weight,
          });
        }}
      />

      <View style={{ height: 16 }} />
      <Pressable style={styles.colorRow} onPress={openColorPicker}>
        <Text style={{ color: theme.text, fontSize: 14 }}>
          {t("editor.chart_text_color", "Text color")}
        </Text>
        <View
          style={[
            styles.colorPreview,
            {
              backgroundColor: options.customColor || String(theme.text),
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

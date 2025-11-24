import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Dropdown } from "@/components/Dropdown";
import { useTranslation } from "react-i18next";
import ColorPickerPanel from "./ColorPickerPanel";
import { MaterialIcons } from "@expo/vector-icons";
import type { ElementId } from "./DraggableItem";
import { TextInput } from "@/components/TextInput";
import ChartEditorPanel from "./editors/ChartEditorPanel";
import CardEditorPanel from "./editors/CardEditorPanel";

export type ShareEditorMode =
  | "options"
  | "text"
  | "chart"
  | "card"
  | "background";

type Props = {
  visible: boolean;
  mode: ShareEditorMode | null;
  options: any;
  selectedId: ElementId | null;
  onChange: (next: any) => void;
  onClose: () => void;
  onTapTextElement?: (id: ElementId) => void;
};

type FontFamilyOption = {
  label: string;
  value: string | null;
  previewFamily?: string;
};

type FontWeightOption = {
  label: string;
  value: string | null;
};

export default function ShareEditorPanel({
  visible,
  mode,
  options,
  selectedId,
  onChange,
  onClose,
  onTapTextElement,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["share", "common"]);

  if (!visible || !mode) return null;

  if (mode === "chart") {
    return (
      <ChartEditorPanel
        options={options}
        onChange={onChange}
        onClose={onClose}
      />
    );
  }

  const patch = (p: any) => {
    let changed = false;
    for (const key in p) {
      if (p[key] !== options[key]) {
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

  const addCustomText = () => {
    const id = `custom:${Date.now()}`;
    const next = [
      ...customTexts,
      {
        id,
        text: "",
        x: 0.5,
        y: 0.42,
        size: 1,
        rotation: 0,
      },
    ];
    onChange({ ...options, showCustom: true, customTexts: next });
    onTapTextElement?.(id as ElementId);
  };

  const elementItems: { key: string; label: string }[] = [
    { key: "showTitle", label: t("editor.show_title", "Title") },
    { key: "showKcal", label: t("editor.show_kcal", "Calories") },
    { key: "showChart", label: t("editor.show_chart", "Chart") },
    {
      key: "showMacroOverlay",
      label: t("editor.show_macros", "Macro overlay"),
    },
    { key: "showCustom", label: t("editor.show_custom", "Custom text") },
  ];

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
    { label: "Inter", value: "Inter", previewFamily: "Inter-500" },
    { label: "Lato", value: "Lato", previewFamily: "Lato-500" },
    { label: "Manrope", value: "Manrope", previewFamily: "Manrope-500" },
    {
      label: "Merriweather",
      value: "Merriweather",
      previewFamily: "Merriweather-500",
    },
    {
      label: "Montserrat",
      value: "Montserrat",
      previewFamily: "Montserrat-500",
    },
    { label: "Nunito", value: "Nunito", previewFamily: "Nunito-500" },
    { label: "Open Sans", value: "OpenSans", previewFamily: "OpenSans-500" },
    { label: "Oswald", value: "Oswald", previewFamily: "Oswald-500" },
    { label: "Poppins", value: "Poppins", previewFamily: "Poppins-500" },
    { label: "Raleway", value: "Raleway", previewFamily: "Raleway-500" },
    { label: "Roboto", value: "Roboto", previewFamily: "Roboto-500" },
    { label: "Rubik", value: "Rubik", previewFamily: "Rubik-500" },
    { label: "Ubuntu", value: "Ubuntu", previewFamily: "Ubuntu-500" },
    { label: "Work Sans", value: "WorkSans", previewFamily: "WorkSans-500" },
    { label: "DM Sans", value: "DMSans", previewFamily: "DMSans-500" },
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
  const currentWeight: string | null = options.textFontWeight ?? "500";

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {mode === "options" && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t("editor.elements", "Elements")}
          </Text>

          <View style={styles.checklistContainer}>
            {elementItems.map((item) => {
              const isCustom = item.key === "showCustom";

              if (isCustom) {
                const hasCustomText =
                  customTexts.length > 0 &&
                  customTexts.some(
                    (ct: any) =>
                      typeof ct.text === "string" && ct.text.trim().length > 0
                  );

                return (
                  <Pressable
                    key={item.key}
                    style={styles.dropdownRow}
                    onPress={addCustomText}
                  >
                    <MaterialIcons
                      name={hasCustomText ? "edit" : "add"}
                      size={20}
                      color={
                        hasCustomText
                          ? theme.accentSecondary
                          : theme.textSecondary
                      }
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: theme.text,
                        fontSize: 18,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }

              const active = !!options[item.key];
              return (
                <Pressable
                  key={item.key}
                  style={styles.dropdownRow}
                  onPress={() => patch({ [item.key]: !active })}
                >
                  <MaterialIcons
                    name={active ? "check-box" : "check-box-outline-blank"}
                    size={20}
                    color={active ? theme.accentSecondary : theme.textSecondary}
                  />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: theme.text,
                      fontSize: 18,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {mode === "text" && (
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
                patch({ [activeText.key]: txt });
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
              const weight = currentWeight || "500";
              patch({
                textFontFamilyKey: famKey,
                textFontWeight: weight,
                textFontFamily:
                  famKey && weight ? `${famKey}-${weight}` : undefined,
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
              const weight = w || "500";
              const famKey = currentFamilyKey;
              patch({
                textFontWeight: weight,
                textFontFamily:
                  famKey && weight ? `${famKey}-${weight}` : undefined,
              });
            }}
          />
        </View>
      )}

      {mode === "card" && (
        <CardEditorPanel options={options} onChange={onChange} />
      )}

      {mode === "background" && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t("editor.background_color")}
          </Text>
          <ColorPickerPanel
            value={options.bgColor || "#000000"}
            onChange={(hex) => patch({ bgColor: hex })}
          />
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={onClose}
          style={[styles.button, { backgroundColor: theme.accentSecondary }]}
        >
          <Text style={{ color: theme.onAccent, fontSize: 14 }}>
            {t("editor.done")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 16,
    right: 64,
    top: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    zIndex: 30,
  },
  section: { marginBottom: 12 },
  label: { fontSize: 16 },
  actions: { alignItems: "center", marginTop: 8 },
  button: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8 },
  checklistContainer: {
    marginTop: 6,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
});

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import ColorPickerPanel from "./ColorPickerPanel";
import { MaterialIcons } from "@expo/vector-icons";
import type { ElementId } from "./DraggableItem";
import ChartEditorPanel from "./editors/ChartEditorPanel";
import CardEditorPanel from "./editors/CardEditorPanel";
import TextEditorPanel from "./editors/TextEditorPanel";

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
  const [isTextColorEditing, setIsTextColorEditing] = useState(false);
  const [isCardColorEditing, setIsCardColorEditing] = useState(false);

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

  const shouldShowDone =
    (mode !== "text" || !isTextColorEditing) &&
    (mode !== "card" || !isCardColorEditing);

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
        <TextEditorPanel
          options={options}
          selectedId={selectedId}
          onChange={onChange}
          onTapTextElement={onTapTextElement}
          onColorPickingChange={setIsTextColorEditing}
        />
      )}

      {mode === "card" && (
        <CardEditorPanel
          options={options}
          onChange={onChange}
          onColorPickingChange={setIsCardColorEditing}
        />
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

      {shouldShowDone && (
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
      )}
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

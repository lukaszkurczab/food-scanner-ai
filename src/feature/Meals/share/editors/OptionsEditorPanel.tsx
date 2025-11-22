import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import type { ElementId } from "./DraggableItem";
import type { ShareOptions } from "@/types/share";

type Props = {
  options: ShareOptions;
  selectedId: ElementId | null;
  onChange: (next: ShareOptions) => void;
  onTapTextElement?: (id: ElementId) => void;
};

export default function OptionsEditorPanel({
  options,
  onChange,
  onTapTextElement,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["share"]);

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

  const elementItems: { key: keyof ShareOptions; label: string }[] = [
    { key: "showTitle", label: t("editor.show_title", "Title") },
    { key: "showKcal", label: t("editor.show_kcal", "Calories") },
    { key: "showChart", label: t("editor.show_chart", "Chart") },
    {
      key: "showMacroOverlay",
      label: t("editor.show_macros", "Macro overlay"),
    },
    { key: "showCustom", label: t("editor.show_custom", "Custom text") },
  ];

  return (
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
                key={item.key as string}
                style={styles.dropdownRow}
                onPress={addCustomText}
              >
                <MaterialIcons
                  name={hasCustomText ? "edit" : "add"}
                  size={20}
                  color={
                    hasCustomText ? theme.accentSecondary : theme.textSecondary
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

          const active = !!(options as any)[item.key];
          return (
            <Pressable
              key={item.key as string}
              style={styles.dropdownRow}
              onPress={() =>
                patch({ [item.key]: !active } as Partial<ShareOptions>)
              }
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
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 12 },
  label: { fontSize: 16 },
  checklistContainer: {
    marginTop: 6,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
});

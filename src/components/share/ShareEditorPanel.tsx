import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Dropdown } from "@/components/Dropdown";
import { useTranslation } from "react-i18next";
import ColorPickerPanel from "./ColorPickerPanel";

export type ShareEditorMode = "text" | "chart" | "background";

type Props = {
  visible: boolean;
  mode: ShareEditorMode | null;
  options: any;
  onChange: (next: any) => void;
  onClose: () => void;
};

export default function ShareEditorPanel({
  visible,
  mode,
  options,
  onChange,
  onClose,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["share", "common"]);
  if (!visible || !mode) return null;

  const patch = (p: any) => onChange({ ...options, ...p });

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {mode === "text" && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t("editor.font_family")}
          </Text>
          <Dropdown
            value={options.customFontFamily || null}
            options={[
              { label: "System", value: null },
              { label: "Inter", value: "Inter" },
              { label: "Roboto", value: "Roboto" },
            ]}
            onChange={(fam) => patch({ customFontFamily: fam || undefined })}
          />
        </View>
      )}

      {mode === "chart" && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t("editor.chart_type")}
          </Text>
          <Dropdown
            value={options.chartType || "pie"}
            options={[
              { label: "Pie", value: "pie" },
              { label: "Line", value: "line" },
              { label: "Bar", value: "bar" },
            ]}
            onChange={(type) => patch({ chartType: type })}
          />
        </View>
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
          style={[styles.button, { backgroundColor: theme.accent }]}
        >
          <Text style={{ color: theme.onAccent }}>{t("editor.done")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    zIndex: 30,
  },
  section: { marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 6 },
  actions: { alignItems: "center" },
  button: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
});

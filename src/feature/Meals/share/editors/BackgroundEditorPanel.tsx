import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import ColorPickerPanel from "../ColorPickerPanel";
import type { ShareOptions } from "@/types/share";

type Props = {
  options: ShareOptions;
  onChange: (next: ShareOptions) => void;
};

export default function BackgroundEditorPanel({ options, onChange }: Props) {
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

  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {t("editor.background_color")}
      </Text>
      <ColorPickerPanel
        value={options.bgColor || "#000000"}
        onChange={(hex) => patch({ bgColor: hex })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 12 },
  label: { fontSize: 16 },
});

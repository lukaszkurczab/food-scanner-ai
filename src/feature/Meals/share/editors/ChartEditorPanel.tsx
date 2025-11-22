import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Dropdown } from "@/components/Dropdown";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import ColorPickerPanel from "../ColorPickerPanel";
import type { ChartType, ShareOptions } from "@/types/share";

type Props = {
  options: ShareOptions;
  onChange: (next: ShareOptions) => void;
  onClose: () => void;
};

type ColorTarget =
  | "chartTextColor"
  | "chartProteinColor"
  | "chartCarbsColor"
  | "chartFatColor"
  | "chartBackgroundColor";

type FontFamilyOption = {
  label: string;
  value: string | null;
  previewFamily?: string;
};

type FontWeightOption = {
  label: string;
  value: "300" | "500" | "700";
};

export default function ChartEditorPanel({
  options,
  onChange,
  onClose,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["share", "common"]);
  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [tempColor, setTempColor] = useState<string | null>(null);

  const chartType: ChartType = (options.chartType || "donut") as ChartType;

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

  const currentFamilyKey: string | null = options.chartFontFamilyKey ?? null;
  const currentWeight: "300" | "500" | "700" = options.chartFontWeight ?? "500";

  const openColorPicker = (target: ColorTarget) => {
    const current =
      (options as any)[target] ??
      (target === "chartBackgroundColor" ? "transparent" : "#ffffff");
    setColorTarget(target);
    setTempColor(current);
  };

  const confirmColor = () => {
    if (!colorTarget || !tempColor) {
      setColorTarget(null);
      setTempColor(null);
      return;
    }
    patch({ [colorTarget]: tempColor } as any);
    setColorTarget(null);
    setTempColor(null);
  };

  const cancelColor = () => {
    setColorTarget(null);
    setTempColor(null);
  };

  const renderColorLabel = (target: ColorTarget) => {
    switch (target) {
      case "chartTextColor":
        return t("editor.chart_text_color", "Text color");
      case "chartProteinColor":
        return t("editor.chart_protein_color", "Protein color");
      case "chartCarbsColor":
        return t("editor.chart_carbs_color", "Carbs color");
      case "chartFatColor":
        return t("editor.chart_fat_color", "Fat color");
      case "chartBackgroundColor":
        return t("editor.chart_bg_color", "Background color");
      default:
        return "";
    }
  };

  const innerRadiusRaw =
    typeof options.chartInnerRadiusRatio === "number"
      ? options.chartInnerRadiusRatio
      : 0.64;
  const innerRadius = Math.min(Math.max(innerRadiusRaw, 0.5), 0.8);

  if (colorTarget) {
    const label = renderColorLabel(colorTarget);
    const value =
      tempColor ||
      (options as any)[colorTarget] ||
      (colorTarget === "chartBackgroundColor" ? "transparent" : "#ffffff");

    return (
      <View
        style={[
          styles.panel,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
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

  const toggleBool = (key: keyof ShareOptions) => {
    patch({ [key]: !(options as any)[key] } as any);
  };

  const handleChartTypeChange = (val: string | null) => {
    const type = (val || "pie") as ChartType;
    patch({ chartType: type });
  };

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.chart_type", "Chart type")}
        </Text>
        <Dropdown
          value={chartType}
          options={[
            { label: "Pie", value: "pie" },
            { label: "Donut", value: "donut" },
            { label: "Bar", value: "bar" },
            { label: "Polar area", value: "polarArea" },
            { label: "Radar", value: "radar" },
          ]}
          onChange={handleChartTypeChange}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.chart_options", "Chart options")}
        </Text>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => toggleBool("showChartKcalLabel")}
        >
          <MaterialIcons
            name={
              options.showChartKcalLabel === false
                ? "check-box-outline-blank"
                : "check-box"
            }
            size={20}
            color={
              options.showChartKcalLabel === false
                ? theme.textSecondary
                : theme.accentSecondary
            }
          />
          <Text style={[styles.checkboxText, { color: theme.text }]}>
            {t("editor.show_chart_kcal", "Show kcal in chart")}
          </Text>
        </Pressable>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => toggleBool("showChartLegend")}
        >
          <MaterialIcons
            name={
              options.showChartLegend === false
                ? "check-box-outline-blank"
                : "check-box"
            }
            size={20}
            color={
              options.showChartLegend === false
                ? theme.textSecondary
                : theme.accentSecondary
            }
          />
          <Text style={[styles.checkboxText, { color: theme.text }]}>
            {t("editor.show_chart_legend", "Show legend")}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.chart_text", "Text")}
        </Text>

        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("chartTextColor")}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {t("editor.chart_text_color", "Text color")}
          </Text>
          <View
            style={[
              styles.colorPreview,
              { backgroundColor: options.chartTextColor || theme.text },
            ]}
          />
        </Pressable>

        <Text
          style={[
            styles.subLabel,
            { color: theme.textSecondary, marginTop: 8 },
          ]}
        >
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
            patch({ chartFontFamilyKey: famKey });
          }}
        />

        <Text
          style={[
            styles.subLabel,
            { color: theme.textSecondary, marginTop: 8 },
          ]}
        >
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
            patch({ chartFontWeight: weight });
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.chart_colors", "Macro colors")}
        </Text>

        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("chartProteinColor")}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {t("meals:protein", "Protein")}
          </Text>
          <View
            style={[
              styles.colorPreview,
              { backgroundColor: options.chartProteinColor || theme.accent },
            ]}
          />
        </Pressable>

        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("chartCarbsColor")}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {t("meals:carbs", "Carbs")}
          </Text>
          <View
            style={[
              styles.colorPreview,
              { backgroundColor: options.chartCarbsColor || theme.accent },
            ]}
          />
        </Pressable>

        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("chartFatColor")}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {t("meals:fat", "Fat")}
          </Text>
          <View
            style={[
              styles.colorPreview,
              { backgroundColor: options.chartFatColor || theme.accent },
            ]}
          />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.chart_bg_color", "Chart background")}
        </Text>
        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("chartBackgroundColor")}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {t("editor.chart_bg_color", "Background color")}
          </Text>
          <View
            style={[
              styles.colorPreview,
              {
                backgroundColor: options.chartBackgroundColor || "transparent",
              },
            ]}
          />
        </Pressable>
      </View>

      {chartType === "donut" && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t("editor.donut_style", "Donut width")}
          </Text>
          <View style={styles.innerRadiusRow}>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
              {t("editor.inner_radius", "Inner radius")}
            </Text>
            <Text style={{ color: theme.text, fontSize: 14 }}>
              {(innerRadius * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.innerRadiusControls}>
            <Pressable
              style={[styles.stepButton, { backgroundColor: theme.background }]}
              onPress={() =>
                patch({
                  chartInnerRadiusRatio: Math.max(innerRadius - 0.02, 0.5),
                })
              }
            >
              <Text style={{ color: theme.text, fontSize: 16 }}>−</Text>
            </Pressable>
            <Pressable
              style={[styles.stepButton, { backgroundColor: theme.background }]}
              onPress={() =>
                patch({
                  chartInnerRadiusRatio: Math.min(innerRadius + 0.02, 0.8),
                })
              }
            >
              <Text style={{ color: theme.text, fontSize: 16 }}>+</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={onClose}
          style={[styles.button, { backgroundColor: theme.accentSecondary }]}
        >
          <Text style={{ color: theme.onAccent, fontSize: 14 }}>
            {t("editor.done", "Done")}
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
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 13,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  checkboxText: {
    marginLeft: 8,
    fontSize: 14,
  },
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
  actions: {
    alignItems: "center",
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  colorActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  innerRadiusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  innerRadiusControls: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  stepButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});

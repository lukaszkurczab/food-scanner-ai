import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { Dropdown } from "@/components/Dropdown";
import { MaterialIcons } from "@expo/vector-icons";
import ColorPickerPanel from "../ColorPickerPanel";
import type { ShareOptions, CardVariant } from "@/types/share";

type Props = {
  options: ShareOptions;
  onChange: (next: ShareOptions) => void;
};

type ColorTarget =
  | "cardTextColor"
  | "cardMacroProteinColor"
  | "cardMacroCarbsColor"
  | "cardMacroFatColor"
  | "cardBackgroundColor";

type FontFamilyOption = {
  label: string;
  value: string | null;
  previewFamily?: string;
};

type FontWeightOption = {
  label: string;
  value: "300" | "500" | "700";
};

type TabKey = "type" | "text" | "colors";

export default function CardEditorPanel({ options, onChange }: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["share", "common"]);
  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [tempColor, setTempColor] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("type");

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

  const cardVariantOptions: { label: string; value: CardVariant }[] = [
    {
      label: t("editor.card.summary", "Summary card"),
      value: "macroSummaryCard",
    },
    {
      label: t("editor.card.vertical", "Vertical stack"),
      value: "macroVerticalStackCard",
    },
    {
      label: t("editor.card.badge", "Badge card"),
      value: "macroBadgeCard",
    },
    {
      label: t("editor.card.split", "Split card"),
      value: "macroSplitCard",
    },
    {
      label: t("editor.card.tags", "Tag strip"),
      value: "macroTagStripCard",
    },
  ];

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

  const currentFamilyKey: string | null = options.cardFontFamilyKey ?? null;
  const currentWeight: "300" | "500" | "700" = options.cardFontWeight ?? "500";

  const openColorPicker = (target: ColorTarget) => {
    const fallback =
      target === "cardBackgroundColor"
        ? "rgba(0,0,0,0.35)"
        : target === "cardMacroProteinColor"
        ? String(theme.macro.protein)
        : target === "cardMacroCarbsColor"
        ? String(theme.macro.carbs)
        : target === "cardMacroFatColor"
        ? String(theme.macro.fat)
        : String(theme.text);
    const current = (options as any)[target] || fallback;
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

  if (colorTarget) {
    const value = tempColor || "#ffffff";
    return (
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.card_color_picker", "Pick color")}
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

  const cardShowKcal = options.cardShowKcal ?? true;
  const cardShowMacros = options.cardShowMacros ?? true;

  const renderTypeTab = () => (
    <>
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.card_type", "Card style")}
        </Text>
        <Dropdown
          value={options.cardVariant || "macroSummaryCard"}
          options={cardVariantOptions}
          onChange={(val) => {
            const variant = (val || "macroSummaryCard") as CardVariant;
            patch({ cardVariant: variant });
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.card_content", "Content")}
        </Text>
        <Pressable
          style={styles.toggleRow}
          onPress={() => patch({ cardShowKcal: !cardShowKcal })}
        >
          <MaterialIcons
            name={cardShowKcal ? "check-box" : "check-box-outline-blank"}
            size={20}
            color={cardShowKcal ? theme.accentSecondary : theme.textSecondary}
          />
          <Text style={[styles.toggleText, { color: theme.text }]}>
            {t("editor.show_card_kcal", "Show calories")}
          </Text>
        </Pressable>
        <Pressable
          style={styles.toggleRow}
          onPress={() => patch({ cardShowMacros: !cardShowMacros })}
        >
          <MaterialIcons
            name={cardShowMacros ? "check-box" : "check-box-outline-blank"}
            size={20}
            color={cardShowMacros ? theme.accentSecondary : theme.textSecondary}
          />
          <Text style={[styles.toggleText, { color: theme.text }]}>
            {t("editor.show_card_macros", "Show macros")}
          </Text>
        </Pressable>
      </View>
    </>
  );

  const renderTextTab = () => (
    <View style={styles.section}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {t("editor.card_text", "Text")}
      </Text>

      <Pressable
        style={styles.colorRow}
        onPress={() => openColorPicker("cardTextColor")}
      >
        <Text style={{ color: theme.text, fontSize: 14 }}>
          {t("editor.text_color", "Text color")}
        </Text>
        <View
          style={[
            styles.colorPreview,
            {
              backgroundColor: options.cardTextColor || String(theme.text),
            },
          ]}
        />
      </Pressable>

      <Text
        style={[styles.subLabel, { color: theme.textSecondary, marginTop: 8 }]}
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
          patch({ cardFontFamilyKey: famKey });
        }}
      />

      <Text
        style={[styles.subLabel, { color: theme.textSecondary, marginTop: 8 }]}
      >
        {t("editor.weight", "Weight")}
      </Text>
      <Dropdown
        value={currentWeight}
        options={fontWeightOptions}
        renderLabel={(opt) => {
          const o = opt as FontWeightOption;
          return (
            <Text
              style={{
                fontFamily:
                  currentFamilyKey && o.value
                    ? `${currentFamilyKey}-${o.value}`
                    : theme.typography.fontFamily.regular,
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
          patch({ cardFontWeight: weight });
        }}
      />
    </View>
  );

  const renderColorsTab = () => (
    <>
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.card_macro_colors", "Macro colors")}
        </Text>

        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("cardMacroProteinColor")}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {t("meals:protein", "Protein")}
          </Text>
          <View
            style={[
              styles.colorPreview,
              {
                backgroundColor:
                  options.cardMacroProteinColor || String(theme.macro.protein),
              },
            ]}
          />
        </Pressable>

        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("cardMacroCarbsColor")}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {t("meals:carbs", "Carbs")}
          </Text>
          <View
            style={[
              styles.colorPreview,
              {
                backgroundColor:
                  options.cardMacroCarbsColor || String(theme.macro.carbs),
              },
            ]}
          />
        </Pressable>

        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("cardMacroFatColor")}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {t("meals:fat", "Fat")}
          </Text>
          <View
            style={[
              styles.colorPreview,
              {
                backgroundColor:
                  options.cardMacroFatColor || String(theme.macro.fat),
              },
            ]}
          />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {t("editor.card_background", "Card background")}
        </Text>
        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("cardBackgroundColor")}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {t("editor.card_background", "Background color")}
          </Text>
          <View
            style={[
              styles.colorPreview,
              {
                backgroundColor:
                  options.cardBackgroundColor || "rgba(0,0,0,0.35)",
              },
            ]}
          />
        </Pressable>
      </View>
    </>
  );

  return (
    <View>
      <View style={styles.tabsRow}>
        <Pressable
          style={[
            styles.tab,
            tab === "type" && { backgroundColor: theme.accentSecondary },
          ]}
          onPress={() => setTab("type")}
        >
          <Text
            style={{
              color: tab === "type" ? theme.onAccent : theme.textSecondary,
              fontSize: 14,
            }}
          >
            {t("editor.tab_type", "Type")}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            tab === "text" && { backgroundColor: theme.accentSecondary },
          ]}
          onPress={() => setTab("text")}
        >
          <Text
            style={{
              color: tab === "text" ? theme.onAccent : theme.textSecondary,
              fontSize: 14,
            }}
          >
            {t("editor.tab_text", "Text")}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            tab === "colors" && { backgroundColor: theme.accentSecondary },
          ]}
          onPress={() => setTab("colors")}
        >
          <Text
            style={{
              color: tab === "colors" ? theme.onAccent : theme.textSecondary,
              fontSize: 14,
            }}
          >
            {t("editor.tab_colors", "Colors")}
          </Text>
        </Pressable>
      </View>

      {tab === "type" && renderTypeTab()}
      {tab === "text" && renderTextTab()}
      {tab === "colors" && renderColorsTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 12 },
  label: { fontSize: 16, marginBottom: 4 },
  subLabel: { fontSize: 13 },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
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
  colorActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  toggleText: {
    marginLeft: 8,
    fontSize: 14,
  },
});

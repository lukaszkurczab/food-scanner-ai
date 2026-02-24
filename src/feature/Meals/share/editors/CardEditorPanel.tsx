import { useMemo, useState } from "react";
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
  onColorPickingChange?: (isPicking: boolean) => void;
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

export default function CardEditorPanel({
  options,
  onChange,
  onColorPickingChange,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const { t } = useTranslation(["share", "common"]);
  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [tempColor, setTempColor] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("type");

  const patch = (p: Partial<ShareOptions>) => {
    const changed = (Object.keys(p) as Array<keyof ShareOptions>).some(
      (key) => p[key] !== options[key],
    );
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
    const current =
      target === "cardTextColor"
        ? options.cardTextColor || fallback
        : target === "cardMacroProteinColor"
        ? options.cardMacroProteinColor || fallback
        : target === "cardMacroCarbsColor"
        ? options.cardMacroCarbsColor || fallback
        : target === "cardMacroFatColor"
        ? options.cardMacroFatColor || fallback
        : options.cardBackgroundColor || fallback;
    setColorTarget(target);
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
    if (colorTarget === "cardTextColor") {
      patch({ cardTextColor: tempColor });
    } else if (colorTarget === "cardMacroProteinColor") {
      patch({ cardMacroProteinColor: tempColor });
    } else if (colorTarget === "cardMacroCarbsColor") {
      patch({ cardMacroCarbsColor: tempColor });
    } else if (colorTarget === "cardMacroFatColor") {
      patch({ cardMacroFatColor: tempColor });
    } else {
      patch({ cardBackgroundColor: tempColor });
    }
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
    const value = tempColor || "#ffffff";
    return (
      <View style={styles.section}>
        <Text style={styles.label}>
          {t("editor.card_color_picker", "Pick color")}
        </Text>
        <ColorPickerPanel value={value} onChange={setTempColor} />
        <View style={styles.colorActions}>
          <Pressable
            onPress={cancelColor}
            style={[styles.button, styles.buttonSecondary]}
          >
            <Text style={styles.buttonText}>
              {t("common:back", "Back")}
            </Text>
          </Pressable>
          <Pressable
            onPress={confirmColor}
            style={[styles.button, styles.buttonPrimary]}
          >
            <Text style={styles.buttonTextOnAccent}>
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
        <Text style={styles.label}>
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
        <Text style={styles.label}>
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
          <Text style={styles.toggleText}>
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
          <Text style={styles.toggleText}>
            {t("editor.show_card_macros", "Show macros")}
          </Text>
        </Pressable>
      </View>
    </>
  );

  const renderTextTab = () => (
    <View style={styles.section}>
      <Text style={styles.label}>
        {t("editor.card_text", "Text")}
      </Text>

      <Pressable
        style={styles.colorRow}
        onPress={() => openColorPicker("cardTextColor")}
      >
        <Text style={styles.rowText}>
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

      <Text style={[styles.subLabel, styles.subLabelSpacing]}>
        {t("editor.font_family", "Font family")}
      </Text>
      <Dropdown
        value={currentFamilyKey}
        options={fontFamilyOptions}
        renderLabel={(opt) => {
          const o = opt as FontFamilyOption;
          return (
            <Text
              style={[
                styles.dropdownLabel,
                {
                  fontFamily:
                    o.previewFamily || theme.typography.fontFamily.regular,
                },
              ]}
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

      <Text style={[styles.subLabel, styles.subLabelSpacing]}>
        {t("editor.weight", "Weight")}
      </Text>
      <Dropdown
        value={currentWeight}
        options={fontWeightOptions}
        renderLabel={(opt) => {
          const o = opt as FontWeightOption;
          return (
            <Text
              style={[
                styles.dropdownLabel,
                {
                  fontFamily:
                    currentFamilyKey && o.value
                      ? `${currentFamilyKey}-${o.value}`
                      : theme.typography.fontFamily.regular,
                },
              ]}
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
        <Text style={styles.label}>
          {t("editor.card_macro_colors", "Macro colors")}
        </Text>

        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("cardMacroProteinColor")}
        >
          <Text style={styles.rowText}>
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
          <Text style={styles.rowText}>
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
          <Text style={styles.rowText}>
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
        <Text style={styles.label}>
          {t("editor.card_background", "Card background")}
        </Text>
        <Pressable
          style={styles.colorRow}
          onPress={() => openColorPicker("cardBackgroundColor")}
        >
          <Text style={styles.rowText}>
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
            tab === "type" && styles.tabActive,
          ]}
          onPress={() => setTab("type")}
        >
          <Text style={[styles.tabLabel, tab === "type" && styles.tabLabelActive]}>
            {t("editor.tab_type", "Type")}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            tab === "text" && styles.tabActive,
          ]}
          onPress={() => setTab("text")}
        >
          <Text style={[styles.tabLabel, tab === "text" && styles.tabLabelActive]}>
            {t("editor.tab_text", "Text")}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            tab === "colors" && styles.tabActive,
          ]}
          onPress={() => setTab("colors")}
        >
          <Text
            style={[styles.tabLabel, tab === "colors" && styles.tabLabelActive]}
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

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    section: { marginBottom: theme.spacing.sm },
    label: {
      fontSize: theme.typography.size.base,
      marginBottom: theme.spacing.xs,
      color: theme.textSecondary,
    },
    subLabel: { fontSize: theme.typography.size.sm, color: theme.textSecondary },
    subLabelSpacing: { marginTop: theme.spacing.sm },
    tabsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
      gap: theme.spacing.sm,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.rounded.full,
      alignItems: "center",
      justifyContent: "center",
    },
    tabActive: { backgroundColor: theme.accentSecondary },
    tabLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
    },
    tabLabelActive: { color: theme.onAccent },
    colorRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.xs,
    },
    rowText: { color: theme.text, fontSize: theme.typography.size.sm },
    colorPreview: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    colorActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    button: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.rounded.sm,
    },
    buttonPrimary: { backgroundColor: theme.accentSecondary },
    buttonSecondary: { backgroundColor: theme.background },
    buttonText: { color: theme.text, fontSize: theme.typography.size.sm },
    buttonTextOnAccent: {
      color: theme.onAccent,
      fontSize: theme.typography.size.sm,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.xs,
    },
    toggleText: {
      marginLeft: theme.spacing.sm,
      fontSize: theme.typography.size.sm,
      color: theme.text,
    },
    dropdownLabel: { color: theme.text, fontSize: theme.typography.size.sm },
  });

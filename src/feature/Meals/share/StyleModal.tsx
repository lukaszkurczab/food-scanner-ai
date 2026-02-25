import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Modal } from "@/components/Modal";
import { TextInput as StyledInput } from "@/components/TextInput";
import { parseColor } from "./types/colorUtils";
import { useTranslation } from "react-i18next";
import type { useTheme } from "@/theme/useTheme";

export type StyleTarget = "title" | "kcal" | "custom";

type Props = {
  visible: boolean;
  onClose: () => void;
  target: StyleTarget | null;
  previewText?: string;
  currentFont: "regular" | "medium" | "bold" | "light";
  italic: boolean;
  underline: boolean;
  color: string;
  uniqueQuickColors: string[];
  theme: ReturnType<typeof useTheme>;
  onChangeFont: (v: "regular" | "medium" | "bold" | "light") => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onApplyColor: (hex: string) => void;
  addRecentColor: (hex: string) => Promise<void>;
  customText?: string;
  onChangeCustomText?: (v: string) => void;
};

export function StyleModal({
  visible,
  onClose,
  target,
  previewText,
  currentFont,
  color,
  uniqueQuickColors,
  theme,
  onChangeFont,
  onToggleItalic,
  onToggleUnderline,
  onApplyColor,
  addRecentColor,
  customText,
  onChangeCustomText,
}: Props) {
  const [input, setInput] = useState("");
  const { t } = useTranslation("share");
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const fontStyles = useMemo(
    () => ({
      regular: { fontFamily: theme.typography.fontFamily.regular },
      medium: { fontFamily: theme.typography.fontFamily.medium },
      bold: { fontFamily: theme.typography.fontFamily.bold },
      light: { fontFamily: theme.typography.fontFamily.light },
    }),
    [theme]
  );

  return (
    <Modal visible={visible} onClose={onClose} contentPaddingBottom={8}>
      <View style={styles.container}>
        {target === "custom" && (
          <View style={styles.previewWrap}>
            <Text style={styles.previewText}>
              {previewText}
            </Text>
          </View>
        )}

        <View style={styles.fontRow}>
          {(["regular", "medium", "bold", "light"] as const).map((f) => {
            const active = currentFont === f;
            return (
              <Pressable
                key={f}
                onPress={() => onChangeFont(f)}
                style={[styles.fontChip, active && styles.fontChipActive]}
              >
                <Text style={[styles.fontChipText, fontStyles[f]]}>
                  {t(`editor.font.${f}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.toggleRow}>
          <Pressable
            onPress={onToggleItalic}
            style={styles.toggleChip}
          >
            <Text style={styles.italicText}>
              {t("editor.italic")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onToggleUnderline}
            style={styles.toggleChip}
          >
            <Text style={styles.underlineText}>
              {t("editor.underline")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("editor.color")}
          </Text>
          <View style={styles.swatchRow}>
            {uniqueQuickColors.slice(0, 8).map((hex, idx) => {
              const active = (color || "#FFFFFF").toUpperCase() === hex;
              return (
                <Pressable
                  key={`sw-${idx}-${hex}`}
                  onPress={async () => {
                    onApplyColor(hex);
                    await addRecentColor(hex);
                  }}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: hex },
                      active && styles.swatchActive,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputRow}>
            <View style={styles.flex}>
              <StyledInput
                placeholder={t("editor.color_placeholder_extended")}
                value={input}
                onChangeText={setInput}
                autoCapitalize="none"
                keyboardType="default"
                maxLength={18}
              />
            </View>
            <Pressable
              onPress={async () => {
                const parsed = parseColor(input);
                if (!parsed) return;
                onApplyColor(parsed);
                await addRecentColor(parsed);
              }}
              style={styles.applyButton}
            >
              <Text style={styles.applyLabel}>
                {t("editor.apply")}
              </Text>
            </Pressable>
          </View>

          {typeof customText === "string" && onChangeCustomText && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("editor.text_label")}
              </Text>
              <StyledInput
                placeholder={t("editor.enter_text_placeholder")}
                value={customText}
                onChangeText={onChangeCustomText}
              />
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </View>
    </Modal>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { gap: theme.spacing.sm },
    previewWrap: {
      alignItems: "center",
      paddingVertical: theme.spacing.xs,
    },
    previewText: {
      color: theme.text,
      fontSize: theme.typography.size.lg,
      textAlign: "center",
    },
    fontRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
    },
    fontChip: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      borderRadius: theme.rounded.sm,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    fontChipActive: {
      borderColor: theme.accentSecondary,
      backgroundColor: theme.overlay,
    },
    fontChipText: {
      color: theme.text,
    },
    toggleRow: { flexDirection: "row", gap: theme.spacing.sm },
    toggleChip: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      borderRadius: theme.rounded.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    italicText: { color: theme.text, fontStyle: "italic" },
    underlineText: { color: theme.text, textDecorationLine: "underline" },
    section: { gap: theme.spacing.sm },
    sectionTitle: {
      color: theme.text,
      fontSize: theme.typography.size.md,
    },
    swatchRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
    },
    swatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.border,
    },
    swatchActive: {
      borderColor: theme.accentSecondary,
    },
    inputRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      alignItems: "center",
    },
    flex: { flex: 1 },
    applyButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.rounded.sm,
      backgroundColor: theme.card,
    },
    applyLabel: {
      color: theme.text,
      fontSize: theme.typography.size.md,
    },
    bottomSpacer: { height: theme.spacing.xs },
  });

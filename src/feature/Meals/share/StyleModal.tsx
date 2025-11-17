import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Modal } from "@/components/Modal";
import { TextInput as StyledInput } from "@/components/TextInput";
import { parseColor } from "./colorUtils";
import { useTranslation } from "react-i18next";

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
  theme: any;
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

  return (
    <Modal visible={visible} onClose={onClose} contentPaddingBottom={8}>
      <View style={{ gap: 12 }}>
        {target === "custom" && (
          <View style={{ alignItems: "center", paddingVertical: 4 }}>
            <Text style={{ color, fontSize: 20, textAlign: "center" }}>
              {previewText}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(["regular", "medium", "bold", "light"] as const).map((f) => {
            const active = currentFont === f;
            return (
              <Pressable
                key={f}
                onPress={() => onChangeFont(f)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: active ? theme.accentSecondary : theme.border,
                  backgroundColor: active ? theme.overlay : theme.card,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontFamily:
                      theme.typography.fontFamily[f] ||
                      theme.typography.fontFamily.regular,
                  }}
                >
                  {t(`editor.font.${f}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onToggleItalic}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ color: theme.text, fontStyle: "italic" }}>
              {t("editor.italic")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onToggleUnderline}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{ color: theme.text, textDecorationLine: "underline" }}
            >
              {t("editor.underline")}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <Text
            style={{ color: theme.text, fontSize: theme.typography.size.md }}
          >
            {t("editor.color")}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
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
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: hex,
                      borderWidth: 2,
                      borderColor: active
                        ? theme.accentSecondary
                        : theme.border,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
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
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                backgroundColor: theme.card,
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: theme.typography.size.md,
                }}
              >
                {t("editor.apply")}
              </Text>
            </Pressable>
          </View>

          {typeof customText === "string" && onChangeCustomText && (
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: theme.typography.size.md,
                }}
              >
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

        <View style={{ height: 4 }} />
      </View>
    </Modal>
  );
}

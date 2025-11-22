import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { Dropdown } from "@/components/Dropdown";
import type { ShareOptions, CardVariant } from "@/types/share";

type Props = {
  options: ShareOptions;
  onChange: (next: ShareOptions) => void;
};

export default function CardEditorPanel({ options, onChange }: Props) {
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

  return (
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
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 12 },
  label: { fontSize: 16 },
});

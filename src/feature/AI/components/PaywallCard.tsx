import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { useTranslation } from "react-i18next";

type Props = {
  used: number;
  limit: number;
  onUpgrade?: () => void;
};

export const PaywallCard: React.FC<Props> = ({ used, limit, onUpgrade }) => {
  const theme = useTheme();
  const { t } = useTranslation("chat");

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.text }]}>
        {t("limit.title")}
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        {t("limit.body", { used, limit })}
      </Text>

      <Pressable
        onPress={onUpgrade}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: theme.accentSecondary,
            borderRadius: theme.rounded.full,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        accessibilityRole="button"
      >
        <Text style={[styles.ctaLabel, { color: theme.onAccent }]}>
          {t("limit.button")}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    alignSelf: "stretch",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  body: { fontSize: 16, marginBottom: 12, textAlign: "center" },
  cta: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  ctaLabel: { fontSize: 15, fontWeight: "700" },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { useTranslation } from "react-i18next";

export const OfflineBanner: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation("chat");

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.overlay,
          borderColor: theme.accentSecondary,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={[styles.title, { color: theme.text }]}>
        {t("offline.title")}
      </Text>
      <Text style={[styles.desc, { color: theme.textSecondary }]}>
        {t("offline.subtitle")}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    margin: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  title: { fontWeight: "700", marginBottom: 2 },
  desc: { fontSize: 13 },
});

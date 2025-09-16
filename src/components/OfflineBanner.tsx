import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";

type Props = {
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  compact?: boolean;
};

export const OfflineBanner: React.FC<Props> = ({
  title,
  subtitle,
  style,
  compact = false,
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["chat", "common"]);

  const resolvedTitle =
    title ?? t("offline.title", { ns: "chat", defaultValue: "Offline mode" });
  const resolvedSubtitle =
    subtitle ??
    t("offline.subtitle", {
      ns: "chat",
      defaultValue: "Showing local data.",
    });

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.overlay,
          borderColor: theme.accentSecondary,
          padding: compact ? 8 : 12,
          margin: compact ? 8 : 12,
          borderRadius: theme.rounded?.md ?? 12,
        },
        style,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.text,
            fontWeight: "700",
            marginBottom: compact ? 0 : 2,
          },
        ]}
      >
        {resolvedTitle}
      </Text>
      {!compact && (
        <Text style={[styles.desc, { color: theme.textSecondary }]}>
          {resolvedSubtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
  },
  title: {},
  desc: { fontSize: 13 },
});

export default OfflineBanner;

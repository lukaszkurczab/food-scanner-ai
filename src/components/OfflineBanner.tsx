import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
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
          backgroundColor: theme.error.background,
          borderColor: theme.error.border,
          paddingVertical: compact ? 10 : 14,
          paddingHorizontal: compact ? 12 : 16,
          margin: compact ? 8 : 12,
          borderRadius: theme.rounded?.md ?? 12,
        },
        style,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <MaterialIcons
        name="wifi-off"
        size={compact ? 16 : 18}
        color={theme.error.text}
        style={styles.icon}
      />
      <Text
        style={[
          styles.title,
          {
            color: theme.error.text,
            fontFamily: theme.typography.fontFamily.semiBold,
            marginBottom: compact ? 0 : 4,
          },
        ]}
      >
        {resolvedTitle}
      </Text>
      {!compact && <Text style={[styles.desc, { color: theme.error.text }]}>{resolvedSubtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    alignItems: "center",
  },
  icon: {
    marginBottom: 4,
  },
  title: {
    textAlign: "center",
  },
  desc: {
    fontSize: 13,
    textAlign: "center",
  },
});

export default OfflineBanner;

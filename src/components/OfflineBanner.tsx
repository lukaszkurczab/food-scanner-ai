import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import AppIcon from "@/components/AppIcon";

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
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
      testID="offline-banner"
      style={[
        styles.banner,
        compact ? styles.bannerCompact : styles.bannerRegular,
        style,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <AppIcon
        name="wifi-off"
        size={compact ? 16 : 18}
        color={theme.warning.text}
        style={styles.icon}
      />

      <Text style={styles.title}>{resolvedTitle}</Text>

      {!compact ? <Text style={styles.desc}>{resolvedSubtitle}</Text> : null}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    banner: {
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.warning.surface,
      borderColor: theme.warning.main,
      borderRadius: theme.rounded.md,
    },
    bannerCompact: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      margin: 8,
    },
    bannerRegular: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      margin: 12,
    },
    icon: {
      marginBottom: 4,
    },
    title: {
      color: theme.warning.text,
      textAlign: "center",
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    desc: {
      marginTop: 4,
      color: theme.warning.text,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.regular,
      textAlign: "center",
    },
  });

export default OfflineBanner;

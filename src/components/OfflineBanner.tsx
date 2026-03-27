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
    >
      <AppIcon
        name="wifi-off"
        size={compact ? 16 : 18}
        color={theme.textSecondary}
        style={styles.icon}
      />

      <View style={styles.textWrap}>
        <Text style={styles.title}>{resolvedTitle}</Text>
        {!compact ? <Text style={styles.desc}>{resolvedSubtitle}</Text> : null}
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    banner: {
      borderWidth: 1,
      alignItems: "center",
      flexDirection: "row",
      backgroundColor: theme.surfaceAlt,
      borderColor: theme.borderSoft,
      borderRadius: theme.rounded.md,
    },
    bannerCompact: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      margin: 8,
    },
    bannerRegular: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      margin: 12,
    },
    icon: {
      marginRight: theme.spacing.sm,
      alignSelf: "flex-start",
      marginTop: 1,
    },
    textWrap: {
      flex: 1,
    },
    title: {
      color: theme.text,
      textAlign: "left",
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    desc: {
      marginTop: 4,
      color: theme.textSecondary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.regular,
      textAlign: "left",
    },
  });

export default OfflineBanner;

import React, { useMemo } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import AppIcon from "@/components/AppIcon";

type Props = { onPress: () => void; activeCount?: number };

export const FilterBadgeButton: React.FC<Props> = ({
  onPress,
  activeCount = 0,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hasActive = activeCount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed ? styles.btnPressed : null]}
      accessibilityRole="button"
      accessibilityLabel={t("filters")}
    >
      <AppIcon name="filter" size={18} color={theme.textTertiary} />

      {hasActive ? (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{activeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    btn: {
      alignItems: "center",
      justifyContent: "center",
      width: 44,
      height: 44,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      backgroundColor: theme.surface,
      borderColor: theme.borderSoft,
      position: "relative",
      shadowColor: theme.shadow,
      shadowOpacity: theme.isDark ? 0.14 : 0.05,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: theme.isDark ? 0 : 1,
    },
    btnPressed: {
      opacity: 0.82,
    },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xs,
      position: "absolute",
      top: -6,
      right: -4,
      backgroundColor: theme.primary,
    },
    badgeLabel: {
      color: theme.cta.primaryText,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.bold,
    },
  });

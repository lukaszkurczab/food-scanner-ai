import React, { useMemo } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";

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
      <Text style={styles.label}>{t("filters")}</Text>

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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
      position: "relative",
    },
    btnPressed: {
      opacity: 0.9,
    },
    label: {
      color: theme.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    badge: {
      marginLeft: theme.spacing.xs,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xs,
      position: "absolute",
      top: -5,
      right: -5,
      backgroundColor: theme.primary,
    },
    badgeLabel: {
      color: theme.cta.primaryText,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.bold,
    },
  });

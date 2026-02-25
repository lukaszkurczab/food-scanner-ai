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
      style={({ pressed }) => [
        styles.btn,
        {
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={styles.label}>{t("filters")}</Text>
      {hasActive && (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{activeCount}</Text>
        </View>
      )}
    </Pressable>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    btn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.rounded.sm,
      borderWidth: 1,
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    label: {
      color: theme.text,
      fontSize: theme.typography.size.sm,
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
      backgroundColor: theme.accent,
    },
    badgeLabel: {
      color: theme.onAccent,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.typography.fontFamily.bold,
    },
  });

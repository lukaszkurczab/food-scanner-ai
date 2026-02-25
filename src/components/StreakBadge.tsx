import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

export function StreakBadge({ value }: { value: number }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{value}🔥</Text>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    badge: {
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.accentSecondary,
      marginLeft: theme.spacing.sm,
    },
    label: {
      color: theme.onAccent,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.md,
    },
  });

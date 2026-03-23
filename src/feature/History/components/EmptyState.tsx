import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import AppIcon from "@/components/AppIcon";

type Props = { title: string; description?: string };

export const EmptyState: React.FC<Props> = ({ title, description }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <AppIcon name="empty-meals" size={76} color={theme.textSecondary} />
      </View>
      <Text style={styles.title}>
        {title}
      </Text>
      {!!description && (
        <Text style={styles.description}>
          {description}
        </Text>
      )}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { alignItems: "center", padding: theme.spacing.lg },
    iconBox: {
      width: 140,
      height: 140,
      borderRadius: theme.rounded.md,
      marginBottom: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    description: {
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.md,
      fontSize: theme.typography.size.md,
    },
  });

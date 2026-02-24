import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

type Props = { title: string; description?: string };

export const EmptyState: React.FC<Props> = ({ title, description }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <MaterialIcons name="no-meals" size={76} color={theme.textSecondary} />
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
      backgroundColor: theme.card,
      marginBottom: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
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

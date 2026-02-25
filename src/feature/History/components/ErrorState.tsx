import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";

type Props = { message: string; onRetry?: () => void };

export const ErrorState: React.FC<Props> = ({ message, onRetry }) => {
  const theme = useTheme();
  const { t } = useTranslation("common");
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryLabel}>{t("retry")}</Text>
        </Pressable>
      )}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { padding: theme.spacing.lg, alignItems: "center" },
    message: {
      color: theme.error.text,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.sm,
      textAlign: "center",
    },
    retryButton: {
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.rounded.sm,
      backgroundColor: theme.accent,
    },
    retryLabel: {
      color: theme.onAccent,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  });

import { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme/useTheme";

type LoaderProps = {
  text?: string;
  subtext?: string;
  size?: number | "small" | "large";
};

export default function Loader({
  text = "Analyzing your meal...",
  subtext = "This may take a few seconds.",
  size = "large",
}: LoaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator
        size={size}
        color={theme.primary || "#1696ff"}
        style={styles.spinner}
      />
      <Text style={[styles.title, { color: theme.text }]}>{text}</Text>
      <Text style={[styles.subtext, { color: theme.textSecondary }]}>
        {subtext}
      </Text>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center" },
    spinner: {
      marginBottom: theme.spacing.xl + theme.spacing.xs,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: theme.spacing.md - theme.spacing.xs,
    },
    subtext: { fontSize: 16, opacity: 0.85, textAlign: "center" },
  });

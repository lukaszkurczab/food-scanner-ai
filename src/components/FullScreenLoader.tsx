import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  label?: string;
  testID?: string;
};

export function FullScreenLoader({ label, testID }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const indicatorColor = theme.accent ?? theme.accentSecondary ?? theme.text;
  const captionColor = theme.textSecondary ?? theme.text;

  return (
    <View testID={testID} style={styles.container}>
      <ActivityIndicator size="large" color={indicatorColor} />
      {label ? <Text style={[styles.label, { color: captionColor }]}>{label}</Text> : null}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.background,
    },
    label: {
      marginTop: theme.spacing.md - theme.spacing.xs,
      fontSize: theme.typography.size.md,
      textAlign: "center",
      fontFamily: theme.typography.fontFamily.regular,
    },
  });

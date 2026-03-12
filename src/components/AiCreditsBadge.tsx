import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

type AiCreditsBadgeTone = "accent" | "neutral";

type AiCreditsBadgeProps = {
  text: string;
  tone?: AiCreditsBadgeTone;
  testID?: string;
};

export function AiCreditsBadge({
  text,
  tone = "accent",
  testID,
}: AiCreditsBadgeProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const containerStyle =
    tone === "neutral" ? styles.neutralContainer : styles.accentContainer;
  const textStyle = tone === "neutral" ? styles.neutralText : styles.accentText;

  return (
    <View testID={testID} style={[styles.baseContainer, containerStyle]}>
      <Text style={[styles.baseText, textStyle]}>
        {text}
      </Text>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    baseContainer: {
      borderRadius: theme.rounded.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      alignSelf: "flex-start",
    },
    accentContainer: {
      backgroundColor: theme.accentSecondary,
      borderColor: theme.accentSecondary,
    },
    neutralContainer: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    baseText: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.typography.fontFamily.bold,
    },
    accentText: {
      color: theme.onAccent,
    },
    neutralText: {
      color: theme.textSecondary,
    },
  });

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { IconButton } from "@/components/IconButton";
import AppIcon from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";

type Props = {
  title: string;
  subtitle: string;
  onOpenHistory: () => void;
  historyButtonLabel: string;
};

export function ChatHeader({
  title,
  subtitle,
  onOpenHistory,
  historyButtonLabel,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.copyWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <IconButton
        testID="chat-history-button"
        icon={<AppIcon name="menu" />}
        onPress={onOpenHistory}
        variant="ghost"
        size={36}
        iconColor={theme.textSecondary}
        accessibilityLabel={historyButtonLabel}
      />
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    copyWrap: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.h1,
      lineHeight: theme.typography.lineHeight.h1,
      fontFamily: theme.typography.fontFamily.bold,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });

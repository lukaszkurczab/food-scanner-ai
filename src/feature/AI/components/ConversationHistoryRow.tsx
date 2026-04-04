import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ChatThread } from "@/types";
import { useTheme } from "@/theme/useTheme";

type Props = {
  thread: ChatThread;
  active: boolean;
  fallbackTitle: string;
  dateLabel: string;
  onPress: () => void;
};

export function ConversationHistoryRow({
  thread,
  active,
  fallbackTitle,
  dateLabel,
  onPress,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={thread.title || fallbackTitle}
      style={({ pressed }) => [
        styles.row,
        active ? styles.rowActive : styles.rowInactive,
        pressed ? styles.rowPressed : null,
      ]}
    >
      {active ? <View style={styles.activeAccent} /> : null}

      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {thread.title || fallbackTitle}
        </Text>

        {thread.lastMessage ? (
          <Text style={styles.preview} numberOfLines={2}>
            {thread.lastMessage}
          </Text>
        ) : null}
      </View>

      <Text style={styles.date}>{dateLabel}</Text>
    </Pressable>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      borderRadius: theme.rounded.xl,
      borderWidth: 1,
      minHeight: 70,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    rowActive: {
      backgroundColor: theme.surface,
      borderColor: theme.borderSoft,
    },
    rowInactive: {
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.borderSoft,
    },
    rowPressed: {
      opacity: 0.82,
    },
    activeAccent: {
      width: 3,
      height: 52,
      borderRadius: theme.rounded.xs,
      backgroundColor: theme.accentWarm,
      marginTop: 2,
    },
    textWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    preview: {
      color: theme.textTertiary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.regular,
    },
    date: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.medium,
      maxWidth: 56,
      textAlign: "right",
    },
  });

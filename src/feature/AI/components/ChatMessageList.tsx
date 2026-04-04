import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ChatMessage } from "@/types";
import { useTheme } from "@/theme/useTheme";
import { ChatMessageBubble } from "./ChatMessageBubble";

type Props = {
  messages: ChatMessage[];
  typing: boolean;
  loading: boolean;
  emptyState: React.ReactElement;
  onLoadMore: () => void;
  dateLabel: string;
};

export function ChatMessageList({
  messages,
  typing,
  loading,
  emptyState,
  onLoadMore,
  dateLabel,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const keyboardDismissMode: "none" | "interactive" | "on-drag" =
    Platform.OS === "ios" ? "interactive" : "on-drag";

  const data = useMemo(
    () => [...messages].sort((a, b) => b.createdAt - a.createdAt),
    [messages],
  );

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <FlatList
      testID="chat-message-list"
      style={styles.list}
      inverted
      data={data}
      keyExtractor={(item) => item.id}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps="handled"
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      onEndReachedThreshold={0.4}
      onEndReached={onLoadMore}
      renderItem={({ item }) => (
        <View
          testID={item.role === "user" ? "chat-message-user" : "chat-message-ai"}
        >
          <ChatMessageBubble
            role={item.role === "user" ? "user" : "assistant"}
            text={item.content}
          />
        </View>
      )}
      ListHeaderComponent={
        typing ? (
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>...</Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        data.length > 0 ? (
          <Text style={styles.dateStamp}>{dateLabel}</Text>
        ) : null
      }
      ListEmptyComponent={emptyState}
      contentContainerStyle={
        data.length > 0 ? styles.listContent : styles.listContentEmpty
      }
    />
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    list: {
      flex: 1,
      minHeight: 0,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.sm,
    },
    listContentEmpty: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    typingBubble: {
      alignSelf: "flex-start",
      marginBottom: theme.spacing.md,
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      borderRadius: theme.rounded.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    typingText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    dateStamp: {
      alignSelf: "center",
      marginBottom: theme.spacing.md,
      color: theme.textTertiary,
      fontSize: theme.typography.size.overline,
      lineHeight: theme.typography.lineHeight.overline,
      fontFamily: theme.typography.fontFamily.medium,
    },
    loaderWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

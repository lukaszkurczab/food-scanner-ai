import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import type { ChatThread } from "@/types";
import { Button } from "@/components";
import { Drawer } from "@/components/Drawer";
import { useTranslation } from "react-i18next";
import { subscribeToChatThreads } from "@/services/ai/chatThreadRepository";

type Props = {
  open: boolean;
  onClose: () => void;
  userUid: string;
  activeThreadId: string;
  onSelectThread: (threadId: string) => void;
};

export function ChatHistorySheet({
  open,
  onClose,
  userUid,
  activeThreadId,
  onSelectThread,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  const { t } = useTranslation("chat");

  useEffect(() => {
    if (!open || !userUid) return;

    setLoading(true);
    setRefreshFailed(false);

    const unsub = subscribeToChatThreads({
      userUid,
      onThreads: (items: ChatThread[]) => {
        setThreads(items);
        setLoading(false);
      },
      onError: () => {
        setLoading(false);
        setRefreshFailed(true);
      },
    });

    return unsub;
  }, [open, userUid]);

  const createNewChat = useCallback(() => {
    const localId = `local-${uuidv4()}`;
    onSelectThread(localId);
    onClose();
  }, [onSelectThread, onClose]);

  const rows = useMemo(() => threads, [threads]);

  const emptyStateTitle = refreshFailed
    ? t("history.errorTitle")
    : isOnline
      ? t("history.emptyTitle")
      : t("offline.title");

  const emptyStateDescription = refreshFailed
    ? t("history.refreshError")
    : isOnline
      ? t("history.emptyDescription")
      : t("history.offlineEmpty");

  return (
    <Drawer open={open} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("label")}</Text>

        <Button label={t("new")} onPress={createNewChat} fullWidth={false} />
      </View>

      <View style={styles.listWrap}>
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelectThread(item.id);
                onClose();
              }}
              style={({ pressed }) => [
                styles.item,
                activeThreadId === item.id ? styles.itemActive : null,
                pressed ? styles.itemPressed : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.title || t("label")}
            >
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title || t("new")}
              </Text>

              {!!item.lastMessage && (
                <Text style={styles.itemSub} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {loading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <>
                  <Text style={styles.emptyTitle}>{emptyStateTitle}</Text>
                  <Text style={styles.emptyDescription}>
                    {emptyStateDescription}
                  </Text>
                </>
              )}
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
    </Drawer>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: theme.spacing.sm,
    },
    headerTitle: {
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
    },
    listWrap: {
      flex: 1,
      padding: theme.spacing.sm,
    },
    item: {
      borderRadius: theme.rounded.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      marginBottom: theme.spacing.sm,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    itemActive: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    itemPressed: {
      opacity: 0.9,
    },
    itemTitle: {
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.text,
    },
    itemSub: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: theme.spacing.lg,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      textAlign: "center",
      color: theme.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.bold,
    },
    emptyDescription: {
      textAlign: "center",
      color: theme.textSecondary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });

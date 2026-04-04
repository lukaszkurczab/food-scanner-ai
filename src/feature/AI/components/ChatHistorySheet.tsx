import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";
import { useTranslation } from "react-i18next";
import type { ChatThread } from "@/types";
import { useTheme } from "@/theme/useTheme";
import { subscribeToChatThreads } from "@/services/ai/chatThreadRepository";
import { ConversationHistoryRow } from "./ConversationHistoryRow";

type Props = {
  open: boolean;
  onClose: () => void;
  userUid: string;
  activeThreadId: string;
  onSelectThread: (threadId: string) => void;
};

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatThreadDateLabel(
  value: number | undefined,
  language: string,
  todayLabel: string,
  yesterdayLabel: string,
) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  if (isSameDay(date, now)) return todayLabel;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return yesterdayLabel;

  const dayDistance = Math.floor(
    (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (dayDistance > 1 && dayDistance < 7) {
    return new Intl.DateTimeFormat(language, { weekday: "short" }).format(date);
  }

  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function ChatHistorySheet({
  open,
  onClose,
  userUid,
  activeThreadId,
  onSelectThread,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const keyboardDismissMode: "none" | "interactive" | "on-drag" =
    Platform.OS === "ios" ? "interactive" : "on-drag";
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  const { t, i18n } = useTranslation("chat");

  useEffect(() => {
    if (!open || !userUid) return;

    setLoading(true);
    setRefreshFailed(false);

    const unsubscribe = subscribeToChatThreads({
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

    return unsubscribe;
  }, [open, userUid]);

  const createNewChat = useCallback(() => {
    const localId = `local-${uuidv4()}`;
    onSelectThread(localId);
    onClose();
  }, [onClose, onSelectThread]);

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
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>{t("history.title")}</Text>
              <Text style={styles.subtitle}>{t("history.subtitle")}</Text>
            </View>

            <Pressable
              onPress={createNewChat}
              style={({ pressed }) => [
                styles.newChatButton,
                pressed ? styles.newChatButtonPressed : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("new")}
            >
              <Text style={styles.newChatLabel}>{t("history.newChat")}</Text>
            </Pressable>
          </View>

          <View style={styles.headerDivider} />

          <FlatList
            data={threads}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode={keyboardDismissMode}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <ConversationHistoryRow
                thread={item}
                active={item.id === activeThreadId}
                fallbackTitle={t("new")}
                dateLabel={formatThreadDateLabel(
                  item.lastMessageAt ?? item.updatedAt,
                  i18n.language,
                  t("history.when.today"),
                  t("history.when.yesterday"),
                )}
                onPress={() => {
                  onSelectThread(item.id);
                  onClose();
                }}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.rowGap} />}
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
          />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.overlay,
    },
    sheet: {
      borderTopLeftRadius: theme.rounded.xxl,
      borderTopRightRadius: theme.rounded.xxl,
      backgroundColor: theme.surfaceElevated,
      borderTopWidth: 1,
      borderColor: theme.borderSoft,
      minHeight: "62%",
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    dragHandle: {
      width: 48,
      height: 4,
      borderRadius: theme.rounded.full,
      alignSelf: "center",
      backgroundColor: theme.border,
      marginBottom: theme.spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.h1,
      lineHeight: theme.typography.lineHeight.h1,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    subtitle: {
      color: theme.textTertiary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.regular,
    },
    newChatButton: {
      height: 36,
      minWidth: 102,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.primary,
      paddingHorizontal: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    newChatButtonPressed: {
      opacity: 0.82,
    },
    newChatLabel: {
      color: theme.textInverse,
      fontSize: theme.typography.size.labelS,
      lineHeight: theme.typography.lineHeight.labelS,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    headerDivider: {
      height: 1,
      backgroundColor: theme.borderSoft,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    listContent: {
      paddingBottom: theme.spacing.xl,
    },
    rowGap: {
      height: theme.spacing.sm,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: theme.spacing.xxl,
      gap: theme.spacing.xs,
    },
    emptyTitle: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.semiBold,
      textAlign: "center",
    },
    emptyDescription: {
      color: theme.textTertiary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.regular,
      textAlign: "center",
    },
  });

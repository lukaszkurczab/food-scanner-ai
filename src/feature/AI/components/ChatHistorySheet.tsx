import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from "@react-native-firebase/firestore";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import type { ChatThread } from "@/types";
import { Drawer } from "@/components/Drawer";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onClose: () => void;
  userUid: string;
  activeThreadId: string;
  onSelectThread: (threadId: string) => void;
};

type ChatThreadDoc = Partial<
  Pick<
    ChatThread,
    "title" | "createdAt" | "updatedAt" | "lastMessage" | "lastMessageAt"
  >
>;

export function ChatHistorySheet({
  open,
  onClose,
  userUid,
  activeThreadId,
  onSelectThread,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const [threads, setThreads] = useState<ChatThread[]>([]);

  const { t } = useTranslation("chat");

  useEffect(() => {
    if (!open || !userUid) return;

    const db = getFirestore(getApp());
    const col = collection(db, "users", userUid, "chat_threads");
    const q = query(col, orderBy("updatedAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      if (!snap) return;

      const items: ChatThread[] = snap.docs.map(
        (d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = d.data() as ChatThreadDoc;
          return {
            id: d.id,
            userUid,
            title: data.title ?? t("new"),
            createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
            updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
            lastMessage: data.lastMessage,
            lastMessageAt: data.lastMessageAt,
          };
        },
      );

      setThreads(items);
    });

    return unsub;
  }, [open, userUid]);

  const createNewChat = useCallback(() => {
    const localId = `local-${uuidv4()}`;
    onSelectThread(localId);
    onClose();
  }, [onSelectThread, onClose]);

  const rows = useMemo(() => threads, [threads]);

  return (
    <Drawer open={open} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("label")}</Text>

        <Pressable
          onPress={createNewChat}
          style={({ pressed }) => [
            styles.newBtn,
            {
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("new")}
        >
          <Text style={styles.newBtnText}>{t("new")}</Text>
        </Pressable>
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
                {
                  backgroundColor:
                    activeThreadId === item.id
                      ? theme.overlay
                      : "transparent",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.title || t("label")}
            >
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title ?? t("new")}
              </Text>
              {!!item.lastMessage && (
                <Text style={styles.itemSub} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              )}
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </Drawer>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: theme.spacing.sm,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm + theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: theme.spacing.sm,
    },
    headerTitle: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.extraBold,
      color: theme.text,
    },
    newBtn: {
      height: 40,
      borderRadius: theme.rounded.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.accentSecondary,
    },
    newBtnText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.extraBold,
      color: theme.onAccent,
    },
    listWrap: { flex: 1, padding: theme.spacing.sm },
    item: {
      borderRadius: theme.rounded.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      marginBottom: theme.spacing.sm,
      borderColor: theme.border,
    },
    itemTitle: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
    },
    itemSub: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.xs,
      color: theme.textSecondary,
    },
    listContent: {
      paddingBottom: theme.spacing.lg,
    },
  });

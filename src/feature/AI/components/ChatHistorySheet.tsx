import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from "@react-native-firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import type { ChatThread } from "@/types";
import { Drawer } from "@/components/Drawer";
import { useTranslation } from "node_modules/react-i18next";

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
        (d: { data: () => any; id: any }) => {
          const data = d.data() as any;
          return {
            id: d.id,
            userUid,
            title: data.title ?? "New chat",
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
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t("label")}
        </Text>

        <Pressable
          onPress={createNewChat}
          style={({ pressed }) => [
            styles.newBtn,
            {
              backgroundColor: theme.accentSecondary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="New chat"
        >
          <Text style={[styles.newBtnText, { color: theme.onAccent }]}>
            {t("new")}
          </Text>
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
                    activeThreadId === item.id ? theme.overlay : "transparent",
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.title || "Chat"}
            >
              <Text
                style={[styles.itemTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.title ?? "New chat"}
              </Text>
              {!!item.lastMessage && (
                <Text
                  style={[styles.itemSub, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
              )}
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  newBtn: {
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  newBtnText: { fontSize: 14, fontWeight: "800" },
  listWrap: { flex: 1, padding: 10 },
  item: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemTitle: { fontSize: 14, fontWeight: "700" },
  itemSub: { marginTop: 4, fontSize: 12 },
  sep: { height: 1, marginVertical: 8 },
});

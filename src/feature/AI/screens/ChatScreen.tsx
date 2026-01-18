import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext } from "@/context/AuthContext";
import { useUser } from "@hooks/useUser";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { useNetInfo } from "@react-native-community/netinfo";
import { Bubble } from "../components/Bubble";
import { InputBar } from "../components/InputBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PaywallCard } from "../components/PaywallCard";
import { TypingDots } from "../components/TypingDots";
import { useMeals } from "@hooks/useMeals";
import { EmptyState } from "../components/EmptyState";
import { ChatHistorySheet } from "../components/ChatHistorySheet";
import { IconButton } from "@/components/IconButton";
import { MaterialIcons } from "@expo/vector-icons";
import { v4 as uuidv4 } from "uuid";

export default function ChatScreen() {
  const { firebaseUser: user } = useAuthContext();
  const theme = useTheme();
  const { t } = useTranslation("chat");
  const net = useNetInfo();
  const uid = user?.uid || "";
  const { userData, loading: loadingUser } = useUser(uid);
  const subscription = useSubscriptionData();
  const isPremium = subscription?.state === "premium_active";
  const { meals } = useMeals(uid);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [threadId, setThreadId] = useState<string>(() => `local-${uuidv4()}`);

  const limit = 5;

  const {
    messages,
    loading,
    sending,
    typing,
    canSend,
    countToday,
    send,
    loadMore,
  } = useChatHistory(
    uid,
    !!isPremium,
    meals || [],
    userData || ({} as any),
    threadId,
  );

  const data = useMemo(
    () => [...messages].sort((a, b) => b.createdAt - a.createdAt),
    [messages],
  );

  const limitReached = !isPremium && countToday >= limit;

  const handleSend = useCallback(
    async (text: string) => {
      if (!net.isConnected) return;
      if (limitReached) return;
      const createdThreadId = await send(text);
      if (createdThreadId) setThreadId(createdThreadId);
    },
    [net.isConnected, limitReached, send],
  );

  const suggestions = useMemo(
    () => [
      { label: t("empty.s1"), value: t("empty.v1") },
      { label: t("empty.s2"), value: t("empty.v2") },
      { label: t("empty.s3"), value: t("empty.v3") },
      { label: t("empty.s4"), value: t("empty.v4") },
    ],
    [t],
  );

  const footerText = useMemo(() => {
    if (!isPremium) return t("empty.footerFree", { used: countToday, limit });
    return t("empty.footerPremium");
  }, [isPremium, countToday, limit, t]);

  const emptyDisabled = sending || limitReached || !net.isConnected;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <IconButton
          icon={<MaterialIcons name="menu" />}
          onPress={() => setHistoryOpen(true)}
          variant="ghost"
          size={40}
          iconColor={theme.textSecondary}
          accessibilityLabel={t("history.open")}
        />
      </View>

      {limitReached && (
        <View
          style={[
            styles.stickyBanner,
            {
              backgroundColor: theme.overlay,
              borderColor: theme.accentSecondary,
              shadowColor: theme.shadow,
            },
          ]}
          pointerEvents="box-none"
        >
          <PaywallCard used={countToday} limit={limit} onUpgrade={() => {}} />
        </View>
      )}

      {!net.isConnected && <OfflineBanner />}

      {loading || loadingUser ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <FlatList
            inverted
            data={data}
            keyExtractor={(m) => m.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Bubble
                role={item.role === "user" ? "user" : "ai"}
                text={item.content}
                timestamp={new Date(item.createdAt)}
              />
            )}
            onEndReachedThreshold={0.4}
            onEndReached={loadMore}
            ListHeaderComponent={
              !canSend && !isPremium ? <View /> : typing ? <TypingDots /> : null
            }
            ListEmptyComponent={
              <EmptyState
                title={t("empty.title")}
                subtitle={t("empty.subtitle")}
                suggestions={suggestions}
                disabled={emptyDisabled}
                footerText={footerText}
                onPick={handleSend}
              />
            }
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 16 + (limitReached ? 160 : 0),
            }}
          />
          <InputBar
            placeholder={t("input.placeholder")}
            disabled={sending || limitReached || !net.isConnected}
            onSend={handleSend}
          />
        </KeyboardAvoidingView>
      )}

      <ChatHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        userUid={uid}
        activeThreadId={threadId}
        onSelectThread={(id) => setThreadId(id)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  stickyBanner: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 20,
    elevation: 4,
  },
});

import React, { useMemo } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthContext } from "@/src/context/AuthContext";
import { useUser } from "@/src/hooks/useUser";
import { useSubscriptionData } from "@/src/hooks/useSubscriptionData";
import { useChatHistory } from "@/src/hooks/useChatHistory";
import { useTheme } from "@/src/theme/useTheme";
import { useTranslation } from "react-i18next";
import { useNetInfo } from "@react-native-community/netinfo";
import { Bubble } from "../components/Bubble";
import { InputBar } from "../components/InputBar";
import { OfflineBanner } from "../components/OfflineBanner";
import { PaywallCard } from "../components/PaywallCard";
import { useMeals } from "@/src/hooks/useMeals";

export default function ChatScreen() {
  const { user } = useAuthContext();
  const theme = useTheme();
  const { t } = useTranslation("chat");
  const net = useNetInfo();
  const uid = user?.uid || "";
  const { userData, loading: loadingUser } = useUser(uid);
  const subscription = useSubscriptionData();
  const isPremium = subscription?.state === "premium_active";
  const { meals } = useMeals(uid);

  const {
    messages,
    loading,
    sending,
    typing,
    canSend,
    countToday,
    send,
    loadMore,
  } = useChatHistory(uid, !!isPremium, meals || [], userData || ({} as any));

  const data = useMemo(
    () =>
      [...messages]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((m) => ({ ...m })),
    [messages]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!net.isConnected && <OfflineBanner />}
      {loading || loadingUser ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <FlatList
            inverted
            data={data}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <Bubble msg={item} />}
            onEndReachedThreshold={0.4}
            onEndReached={loadMore}
            ListFooterComponent={
              !canSend && !isPremium ? (
                <PaywallCard used={countToday} limit={5} />
              ) : typing ? (
                <Bubble
                  msg={{
                    id: "typing",
                    userUid: uid,
                    role: "assistant",
                    content: t("typing"),
                    createdAt: Date.now(),
                    lastSyncedAt: 0,
                    syncState: "pending" as any,
                  }}
                />
              ) : null
            }
            contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          />
          <InputBar
            placeholder={t("input.placeholder")}
            disabled={!canSend || sending || !net.isConnected}
            onSend={send}
            helperText={
              !canSend && !isPremium
                ? t("limit.reached", { used: countToday, limit: 5 })
                : !net.isConnected
                ? t("offline.short")
                : undefined
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Text,
} from "react-native";
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
import { TypingDots } from "../components/TypingDots";
import { TopToast } from "../components/TopToast";
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
    () => [...messages].sort((a, b) => b.createdAt - a.createdAt),
    [messages]
  );

  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => setToast(msg), []);
  const hideToast = useCallback(() => setToast(null), []);

  const limitReached = !isPremium && countToday >= 5;

  const handleSend = useCallback(
    (text: string) => {
      if (!net.isConnected) {
        showToast(t("offline.short"));
        return;
      }
      if (limitReached) {
        showToast(t("limit.reachedShort", { used: countToday, limit: 5 }));
        return;
      }
      send(text);
    },
    [net.isConnected, limitReached, countToday, send, showToast, t]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
        >
          <PaywallCard used={countToday} limit={5} />
        </View>
      )}

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
                <View style={{ marginTop: 88 }} />
              ) : typing ? (
                <TypingDots />
              ) : null
            }
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 96,
              paddingTop: 16 + (limitReached ? 48 : 0),
            }}
          />
          <InputBar
            placeholder={t("input.placeholder")}
            disabled={sending || limitReached || !net.isConnected}
            onSend={handleSend}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  bannerText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

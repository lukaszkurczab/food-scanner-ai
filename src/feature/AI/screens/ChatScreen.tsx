import { useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useAuthContext } from "@/context/AuthContext";
import { useUserContext } from "@contexts/UserContext";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { useNetInfo } from "@react-native-community/netinfo";
import { Bubble } from "../components/Bubble";
import { InputBar } from "../components/InputBar";
import { PaywallCard } from "../components/PaywallCard";
import { TypingDots } from "../components/TypingDots";
import { useMeals } from "@hooks/useMeals";
import { EmptyState } from "../components/EmptyState";
import { ChatHistorySheet } from "../components/ChatHistorySheet";
import { IconButton } from "@/components/IconButton";
import { AiCreditsBadge } from "@/components/AiCreditsBadge";
import AppIcon from "@/components/AppIcon";
import { v4 as uuidv4 } from "uuid";
import { Layout } from "@components/Layout";
import type { RootStackParamList } from "@/navigation/navigate";
import type { FormData } from "@/types";
import { pullChatChanges } from "@/services/offline/sync.engine";

const EMPTY_PROFILE: FormData = {
  unitsSystem: "metric",
  age: "",
  sex: "female",
  height: "",
  weight: "",
  preferences: [],
  activityLevel: "",
  goal: "",
  surveyComplited: false,
  calorieTarget: 0,
};

export default function ChatScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { firebaseUser: user } = useAuthContext();
  const theme = useTheme();
  const { t } = useTranslation("chat");
  const net = useNetInfo();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const uid = user?.uid || "";
  const { userData } = useUserContext();
  const { credits } = useAiCreditsContext();

  const { meals } = useMeals(uid);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [threadId, setThreadId] = useState<string>(() => `local-${uuidv4()}`);
  const lastUserMessageRef = useRef<string | null>(null);
  const lastChatPullRef = useRef<number>(0);

  const {
    messages,
    loading,
    sending,
    typing,
    sendErrorType,
    failedSyncCount,
    retryingFailedSync,
    canSend,
    creditAllocation,
    send,
    loadMore,
    retryFailedSyncOps,
  } = useChatHistory(
    uid,
    meals || [],
    userData ?? EMPTY_PROFILE,
    threadId,
  );

  const data = useMemo(
    () => [...messages].sort((a, b) => b.createdAt - a.createdAt),
    [messages],
  );

  const limitReached = !canSend;

  const handleSend = useCallback(
    async (text: string) => {
      if (!net.isConnected) return;
      if (!canSend) return;
      lastUserMessageRef.current = text;
      const createdThreadId = await send(text);
      if (createdThreadId) setThreadId(createdThreadId);
    },
    [net.isConnected, canSend, send],
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
    return t("credits.balanceOutOf", {
      balance: credits?.balance ?? 0,
      allocation: credits?.allocation ?? 0,
    });
  }, [credits?.allocation, credits?.balance, t]);
  const offlineEmpty = net.isConnected === false;
  const emptyTitle = offlineEmpty ? t("offline.title") : t("empty.title");
  const emptySubtitle = offlineEmpty
    ? t("offline.subtitle")
    : t("empty.subtitle");
  const emptySuggestions = offlineEmpty ? [] : suggestions;
  const emptyFooterText = offlineEmpty ? undefined : footerText;

  const emptyDisabled = sending || limitReached || !net.isConnected;
  const retryEnabled =
    !!lastUserMessageRef.current &&
    !!net.isConnected &&
    !sending &&
    canSend &&
    (sendErrorType === "offline" ||
      sendErrorType === "timeout" ||
      sendErrorType === "unavailable" ||
      sendErrorType === "unknown");

  const helperText = useMemo(() => {
    if (!net.isConnected) return t("offline.short");
    if (limitReached) {
      return t("limit.reachedShort");
    }
    if (sending) return t("sending", { defaultValue: "AI is thinking..." });
    if (sendErrorType === "offline") return t("errors.offline");
    if (sendErrorType === "timeout") return t("errors.timeout");
    if (sendErrorType === "unavailable") return t("errors.serviceUnavailable");
    if (sendErrorType === "auth") return t("errors.authRequired");
    if (sendErrorType === "unknown") return t("errors.fetchFailed");
    return undefined;
  }, [
    limitReached,
    net.isConnected,
    sendErrorType,
    sending,
    t,
  ]);

  const handleRetry = useCallback(() => {
    const last = lastUserMessageRef.current;
    if (!last) return;
    void handleSend(last);
  }, [handleSend]);

  const listContentStyle = useMemo(
    () => [styles.listContent, limitReached && styles.listContentLimit],
    [limitReached, styles],
  );

  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      const now = Date.now();
      if (now - lastChatPullRef.current < 30_000) return;
      lastChatPullRef.current = now;
      void pullChatChanges(uid).catch(() => {
        // Best-effort background refresh for chat history/messages.
      });
    }, [uid]),
  );

  return (
    <Layout disableScroll style={styles.layout}>
      <View style={styles.header}>
        <IconButton
          testID="chat-history-button"
          icon={<AppIcon name="menu" />}
          onPress={() => setHistoryOpen(true)}
          variant="ghost"
          size={40}
          iconColor={theme.textSecondary}
          accessibilityLabel={t("history.open")}
        />
        <AiCreditsBadge
          text={t("credits.balanceShort", {
            balance: credits?.balance ?? 0,
          })}
          tone={limitReached ? "neutral" : "accent"}
        />
      </View>

      {limitReached && (
        <View style={styles.stickyBanner} pointerEvents="box-none">
          <PaywallCard
            balance={credits?.balance ?? 0}
            allocation={credits?.allocation ?? creditAllocation}
            renewalAt={credits?.periodEndAt ?? null}
            onUpgrade={() => navigation.navigate("ManageSubscription")}
          />
        </View>
      )}

      {failedSyncCount > 0 && (
        <View style={styles.deadLetterBanner}>
          <View style={styles.deadLetterTextWrap}>
            <Text style={styles.deadLetterTitle}>
              {t("deadLetterTitle", { count: failedSyncCount })}
            </Text>
            <Text style={styles.deadLetterDescription}>
              {t("deadLetterSubtitle")}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              void retryFailedSyncOps();
            }}
            disabled={retryingFailedSync}
            style={retryingFailedSync ? styles.deadLetterRetryDisabled : undefined}
          >
            <Text style={styles.deadLetterRetryLabel}>
              {retryingFailedSync ? "…" : t("deadLetterRetry")}
            </Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <FlatList
            testID="chat-message-list"
            style={styles.list}
            inverted
            data={data}
            keyExtractor={(m) => m.id}
            keyboardShouldPersistTaps="handled"
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            renderItem={({ item }) => (
              <View
                testID={
                  item.role === "user"
                    ? "chat-message-user"
                    : "chat-message-ai"
                }
              >
                <Bubble
                  role={item.role === "user" ? "user" : "ai"}
                  text={item.content}
                  timestamp={new Date(item.createdAt)}
                />
              </View>
            )}
            onEndReachedThreshold={0.4}
            onEndReached={loadMore}
            ListHeaderComponent={
              !canSend ? <View /> : typing ? <TypingDots /> : null
            }
            ListEmptyComponent={
              <EmptyState
                title={emptyTitle}
                subtitle={emptySubtitle}
                suggestions={emptySuggestions}
                disabled={emptyDisabled}
                footerText={emptyFooterText}
                onPick={handleSend}
              />
            }
            contentContainerStyle={listContentStyle}
          />
          <InputBar
            placeholder={t("input.placeholder")}
            disabled={sending || limitReached || !net.isConnected}
            onSend={handleSend}
            helperText={helperText}
            helperActionLabel={retryEnabled ? t("retryLast") : undefined}
            onHelperActionPress={retryEnabled ? handleRetry : undefined}
            helperActionDisabled={!retryEnabled}
          />
        </>
      )}

      <ChatHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        userUid={uid}
        activeThreadId={threadId}
        onSelectThread={(id) => setThreadId(id)}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    layout: {
      paddingLeft: 0,
      paddingRight: 0,
    },
    header: {
      height: 44,
      paddingHorizontal: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    list: {
      flex: 1,
      minHeight: 0,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    stickyBanner: {
      position: "absolute",
      top: theme.spacing.sm,
      left: theme.spacing.sm,
      right: theme.spacing.sm,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      zIndex: 20,
      elevation: 4,
      backgroundColor: theme.overlay,
      borderColor: theme.accentSecondary,
      shadowColor: theme.shadow,
    },
    deadLetterBanner: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.rounded.md,
      backgroundColor: theme.warning.background,
      marginHorizontal: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs + 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    deadLetterTextWrap: {
      flex: 1,
      gap: 2,
    },
    deadLetterTitle: {
      color: theme.warning.text,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    deadLetterDescription: {
      color: theme.warning.text,
      fontSize: theme.typography.size.xs,
    },
    deadLetterRetryLabel: {
      color: theme.warning.text,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.semiBold,
      textDecorationLine: "underline",
    },
    deadLetterRetryDisabled: {
      opacity: 0.65,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    listContentLimit: {
      paddingBottom: theme.spacing.md + theme.spacing.xl * 5,
    },
  });

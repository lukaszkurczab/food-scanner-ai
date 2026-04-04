import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNetInfo } from "@react-native-community/netinfo";
import { v4 as uuidv4 } from "uuid";
import { Layout } from "@/components/Layout";
import { useAuthContext } from "@/context/AuthContext";
import { useUserContext } from "@contexts/UserContext";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import { useMeals } from "@hooks/useMeals";
import { useChatHistory } from "@/hooks/useChatHistory";
import { pullChatChanges } from "@/services/offline/sync.engine";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import type { RootStackParamList } from "@/navigation/navigate";
import type { FormData } from "@/types";
import { ChatHeader } from "../components/ChatHeader";
import { ChatIntroCard } from "../components/ChatIntroCard";
import { SuggestedStarterGrid } from "../components/SuggestedStarterGrid";
import { ChatMessageList } from "../components/ChatMessageList";
import { ChatComposer } from "../components/ChatComposer";
import { ChatHistorySheet } from "../components/ChatHistorySheet";
import { ChatStatusBanner } from "../components/ChatStatusBanner";

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
  const { userData } = useUserContext();
  const { credits } = useAiCreditsContext();
  const net = useNetInfo();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("chat");

  const uid = user?.uid || "";
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
    send,
    loadMore,
    retryFailedSyncOps,
  } = useChatHistory(uid, meals || [], userData ?? EMPTY_PROFILE, threadId);

  const isOffline = net.isConnected === false;
  const hasMessages = messages.length > 0;
  const limitReached = !canSend;
  const composerDisabled = sending || limitReached || isOffline;

  const starters = useMemo(
    () => [
      { label: t("empty.starters.week"), value: t("empty.values.week") },
      {
        label: t("empty.starters.protein"),
        value: t("empty.values.protein"),
      },
      { label: t("empty.starters.dinner"), value: t("empty.values.dinner") },
      { label: t("empty.starters.track"), value: t("empty.values.track") },
    ],
    [t],
  );

  const helperText = useMemo(() => {
    if (sending) return t("sending");
    if (sendErrorType === "offline") return t("errors.offline");
    if (sendErrorType === "timeout") return t("errors.timeout");
    if (sendErrorType === "unavailable") return t("errors.serviceUnavailable");
    if (sendErrorType === "auth") return t("errors.authRequired");
    if (sendErrorType === "unknown") return t("errors.fetchFailed");
    return undefined;
  }, [sendErrorType, sending, t]);

  const retryEnabled =
    Boolean(lastUserMessageRef.current) &&
    !sending &&
    canSend &&
    !isOffline &&
    (sendErrorType === "offline" ||
      sendErrorType === "timeout" ||
      sendErrorType === "unavailable" ||
      sendErrorType === "unknown");

  const composerPlaceholder = limitReached
    ? t("composer.lockedCredits")
    : isOffline
      ? t("composer.lockedOffline")
      : t("composer.placeholder");

  const handleSend = useCallback(
    async (text: string) => {
      if (isOffline || !canSend) return;
      lastUserMessageRef.current = text;
      const createdThreadId = await send(text);
      if (createdThreadId) setThreadId(createdThreadId);
    },
    [canSend, isOffline, send],
  );

  const handleRetry = useCallback(() => {
    const last = lastUserMessageRef.current;
    if (!last) return;
    void handleSend(last);
  }, [handleSend]);

  const emptyState = (
    <View style={styles.emptyStateWrap}>
      <ChatIntroCard
        title={isOffline ? t("offline.title") : t("empty.title")}
        subtitle={isOffline ? t("offline.subtitle") : t("empty.subtitle")}
        creditsText={
          isOffline
            ? undefined
            : t("empty.creditsLeft", {
                count: credits?.balance ?? 0,
              })
        }
      />

      {!isOffline ? (
        <SuggestedStarterGrid
          title={t("empty.suggestedLabel")}
          starters={starters}
          disabled={composerDisabled}
          onSelect={(value) => {
            void handleSend(value);
          }}
        />
      ) : null}
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      const now = Date.now();
      if (now - lastChatPullRef.current < 30_000) return;
      lastChatPullRef.current = now;
      void pullChatChanges(uid).catch(() => {});
    }, [uid]),
  );

  return (
    <Layout
      disableScroll
      showOfflineBanner={false}
      style={styles.layout}
      keyboardAvoiding={false}
    >
      <ChatHeader
        title={t("header.title")}
        subtitle={t("header.subtitle")}
        onOpenHistory={() => setHistoryOpen(true)}
        historyButtonLabel={t("history.open")}
      />

      {hasMessages && !isOffline && limitReached ? (
        <ChatStatusBanner
          variant="credits"
          title={t("lock.creditsTitle")}
          body={t("lock.creditsBody")}
          actionLabel={t("lock.creditsAction")}
          onActionPress={() => navigation.navigate("ManageSubscription")}
        />
      ) : null}

      {hasMessages && isOffline ? (
        <ChatStatusBanner
          testID="offline-banner"
          variant="offline"
          title={t("lock.offlineTitle")}
          body={t("lock.offlineBody")}
        />
      ) : null}

      {failedSyncCount > 0 ? (
        <ChatStatusBanner
          variant="warning"
          title={t("deadLetterTitle", { count: failedSyncCount })}
          body={t("deadLetterSubtitle")}
          actionLabel={t("deadLetterRetry")}
          onActionPress={() => {
            void retryFailedSyncOps();
          }}
          actionDisabled={retryingFailedSync}
        />
      ) : null}

      <View style={styles.body}>
        <ChatMessageList
          messages={messages}
          typing={typing && !limitReached && !isOffline}
          loading={loading}
          emptyState={emptyState}
          onLoadMore={loadMore}
          dateLabel={t("conversation.todayLabel")}
        />
      </View>

      <ChatComposer
        placeholder={composerPlaceholder}
        sendLabel={t("input.send")}
        disabled={composerDisabled}
        onSend={handleSend}
        helperText={helperText}
        helperActionLabel={retryEnabled ? t("retryLast") : undefined}
        onHelperActionPress={retryEnabled ? handleRetry : undefined}
        helperActionDisabled={!retryEnabled}
      />

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
    body: {
      flex: 1,
      minHeight: 0,
    },
    emptyStateWrap: {
      flex: 1,
      paddingTop: theme.spacing.xxl,
      gap: theme.spacing.xl,
    },
  });

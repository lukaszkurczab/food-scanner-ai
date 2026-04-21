import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNetInfo } from "@react-native-community/netinfo";
import { v4 as uuidv4 } from "uuid";
import { Button, Modal } from "@/components";
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
import { formatLocalDateTime } from "@/utils/formatLocalDateTime";

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

function getChatLegalAckKey(uid: string): string {
  return `chat_legal_ack:${uid}`;
}

export default function ChatScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { firebaseUser: user } = useAuthContext();
  const { userData, loadingUser } = useUserContext();
  const { credits } = useAiCreditsContext();
  const net = useNetInfo();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation("chat");

  const uid = user?.uid || "";
  const { meals } = useMeals(uid);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [threadId, setThreadId] = useState<string>(() => `local-${uuidv4()}`);
  const [legalAckVisible, setLegalAckVisible] = useState(false);
  const [legalAckLoading, setLegalAckLoading] = useState(true);
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
    retryLastSend,
    cancelInFlightSend,
    loadMore,
    retryFailedSyncOps,
  } = useChatHistory(uid, meals || [], userData ?? EMPTY_PROFILE, threadId);

  const isOffline = net.isConnected === false;
  const hasMessages = messages.length > 0;
  const limitReached = !canSend;
  const renewalDateLabel = formatLocalDateTime(credits?.periodEndAt, {
    locale: i18n?.language,
  });
  const legalGateActive = legalAckLoading || legalAckVisible;
  const profileReadyForAi = !loadingUser;
  const composerDisabled =
    sending ||
    limitReached ||
    isOffline ||
    legalGateActive ||
    !profileReadyForAi;

  useEffect(() => {
    let cancelled = false;

    async function loadLegalAck() {
      if (!uid) {
        if (!cancelled) {
          setLegalAckVisible(false);
          setLegalAckLoading(false);
        }
        return;
      }

      setLegalAckLoading(true);

      try {
        const stored = await AsyncStorage.getItem(getChatLegalAckKey(uid));
        if (!cancelled) {
          setLegalAckVisible(stored !== "accepted");
        }
      } catch {
        if (!cancelled) {
          setLegalAckVisible(true);
        }
      } finally {
        if (!cancelled) {
          setLegalAckLoading(false);
        }
      }
    }

    void loadLegalAck();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function refreshLegalAckOnFocus() {
        if (!uid) return;
        setLegalAckLoading(true);
        try {
          const stored = await AsyncStorage.getItem(getChatLegalAckKey(uid));
          if (active) {
            setLegalAckVisible(stored !== "accepted");
          }
        } catch {
          if (active) {
            setLegalAckVisible(true);
          }
        } finally {
          if (active) {
            setLegalAckLoading(false);
          }
        }
      }

      void refreshLegalAckOnFocus();

      return () => {
        active = false;
      };
    }, [uid]),
  );

  const openLegalDetails = useCallback(() => {
    setLegalAckVisible(false);
    navigation.navigate("DataAiClarity");
  }, [navigation]);

  const openLegalPrivacyHub = useCallback(() => {
    setLegalAckVisible(false);
    navigation.navigate("LegalPrivacyHub");
  }, [navigation]);

  const acknowledgeLegal = useCallback(async () => {
    if (!uid) {
      setLegalAckVisible(false);
      return;
    }

    await AsyncStorage.setItem(getChatLegalAckKey(uid), "accepted");
    setLegalAckVisible(false);
  }, [uid]);

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
    !sending &&
    canSend &&
    !isOffline &&
    !legalGateActive &&
    (sendErrorType === "offline" ||
      sendErrorType === "timeout" ||
      sendErrorType === "unavailable" ||
      sendErrorType === "unknown");

  const composerPlaceholder = limitReached
    ? t("composer.lockedCredits")
    : isOffline
      ? t("composer.lockedOffline")
      : legalGateActive
        ? t("legal.composerLocked")
        : t("composer.placeholder");

  const handleSend = useCallback(
    async (text: string) => {
      if (isOffline || !canSend || legalGateActive || !profileReadyForAi)
        return;
      const createdThreadId = await send(text);
      if (createdThreadId) setThreadId(createdThreadId);
    },
    [canSend, isOffline, legalGateActive, profileReadyForAi, send],
  );

  const handleRetry = useCallback(() => {
    void retryLastSend();
  }, [retryLastSend]);

  const handleBack = useCallback(() => {
    return () => {
      navigation.goBack();
    };
  }, [navigation]);

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
      return () => {
        cancelInFlightSend();
      };
    }, [cancelInFlightSend]),
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
      keyboardAvoiding
    >
      <ChatHeader
        title={t("header.title")}
        subtitle={t("header.subtitle")}
        onOpenHistory={() => {
          if (legalGateActive) return;
          setHistoryOpen(true);
        }}
        historyButtonLabel={t("history.open")}
      />

      {hasMessages && !isOffline && limitReached ? (
        <ChatStatusBanner
          variant="credits"
          title={t("lock.creditsTitle")}
          body={t("limit.body", {
            balance: credits?.balance ?? 0,
            allocation: credits?.allocation ?? 0,
            renewalDate:
              renewalDateLabel ??
              t("credits.renewalUnknown", {
                defaultValue: "Unavailable",
              }),
          })}
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

      <Modal
        visible={legalAckVisible}
        title={t("legal.title")}
        primaryAction={{
          label: t("legal.accept"),
          onPress: () => {
            void acknowledgeLegal();
          },
        }}
        secondaryAction={{
          label: t("legal.back"),
          onPress: handleBack(),
          tone: "secondary",
        }}
        closeOnBackdropPress={false}
      >
        <View style={styles.legalCopy}>
          <Text style={styles.legalParagraph}>{t("legal.informational")}</Text>
          <Text style={styles.legalParagraph}>{t("legal.medical")}</Text>
          <View>
            <Text style={styles.legalParagraph}>{t("legal.moreInfo")}</Text>
            <Button
              label={t("legal.privacy")}
              variant="ghost"
              onPress={openLegalPrivacyHub}
              fullWidth={false}
              style={styles.legalButton}
            />
            <Button
              label={t("legal.learnMore")}
              variant="ghost"
              onPress={openLegalDetails}
              fullWidth={false}
              style={styles.legalButton}
            />
          </View>
        </View>
      </Modal>
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
    legalButton: {
      alignSelf: "flex-start",
      minHeight: 0,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: 0,
    },
    legalCopy: {
      gap: theme.spacing.md,
    },
    legalParagraph: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });

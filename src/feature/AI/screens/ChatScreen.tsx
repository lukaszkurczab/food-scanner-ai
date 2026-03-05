import { useMemo, useState, useCallback } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useAuthContext } from "@/context/AuthContext";
import { useUserContext } from "@contexts/UserContext";
import { usePremiumContext } from "@/context/PremiumContext";
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
import { MaterialIcons } from "@expo/vector-icons";
import { v4 as uuidv4 } from "uuid";
import { Layout } from "@components/Layout";
import type { RootStackParamList } from "@/navigation/navigate";
import type { FormData } from "@/types";

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
  const { isPremium } = usePremiumContext();
  const premiumActive = isPremium === true;

  const { meals } = useMeals(uid);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [threadId, setThreadId] = useState<string>(() => `local-${uuidv4()}`);

  const {
    messages,
    loading,
    sending,
    typing,
    canSend,
    countToday,
    dailyLimit,
    send,
    loadMore,
  } = useChatHistory(
    uid,
    premiumActive,
    meals || [],
    userData ?? EMPTY_PROFILE,
    threadId,
  );

  const data = useMemo(
    () => [...messages].sort((a, b) => b.createdAt - a.createdAt),
    [messages],
  );

  const limitReached = !premiumActive && !canSend;

  const handleSend = useCallback(
    async (text: string) => {
      if (!net.isConnected) return;
      if (!canSend) return;
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
    if (!premiumActive) {
      return t("empty.footerFree", { used: countToday, limit: dailyLimit });
    }
    return t("empty.footerPremium");
  }, [premiumActive, countToday, dailyLimit, t]);

  const emptyDisabled = sending || limitReached || !net.isConnected;
  const listContentStyle = useMemo(
    () => [styles.listContent, limitReached && styles.listContentLimit],
    [limitReached, styles]
  );

  return (
    <Layout disableScroll style={styles.layout}>
      <View style={styles.header}>
        <IconButton
          testID="chat-history-button"
          icon={<MaterialIcons name="menu" />}
          onPress={() => setHistoryOpen(true)}
          variant="ghost"
          size={40}
          iconColor={theme.textSecondary}
          accessibilityLabel={t("history.open")}
        />
      </View>

      {limitReached && (
        <View style={styles.stickyBanner} pointerEvents="box-none">
          <PaywallCard
            used={countToday}
            limit={dailyLimit}
            onUpgrade={() => navigation.navigate("ManageSubscription")}
          />
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
            inverted
            data={data}
            keyExtractor={(m) => m.id}
            keyboardShouldPersistTaps="handled"
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
              !canSend && !premiumActive ? <View /> : typing ? <TypingDots /> : null
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
            contentContainerStyle={listContentStyle}
          />
          <InputBar
            placeholder={t("input.placeholder")}
            disabled={sending || limitReached || !net.isConnected}
            onSend={handleSend}
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
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    listContentLimit: {
      paddingBottom: theme.spacing.md + theme.spacing.xl * 5,
    },
  });

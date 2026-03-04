import { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import {
  PrimaryButton,
  ErrorBox,
  Layout,
  ScreenCornerNavButton,
  SecondaryButton,
} from "@/components";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import type { StackNavigationProp } from "@react-navigation/stack";
import { authLogout } from "@/feature/Auth/services/authService";
import type { RootStackParamList } from "@/navigation/navigate";

type ChangeEmailCheckMailboxRoute = RouteProp<
  RootStackParamList,
  "ChangeEmailCheckMailbox"
>;
type ChangeEmailCheckMailboxNavigation = StackNavigationProp<
  RootStackParamList,
  "ChangeEmailCheckMailbox"
>;

function getErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export default function ChangeEmailCheckMailboxScreen() {
  const { t } = useTranslation(["profile", "common"]);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const route = useRoute<ChangeEmailCheckMailboxRoute>();
  const navigation = useNavigation<ChangeEmailCheckMailboxNavigation>();

  const email =
    route?.params?.email && typeof route.params.email === "string"
      ? route.params.email
      : "";

  const [sending, setSending] = useState(false);
  const [sendAgainDisabled, setSendAgainDisabled] = useState(true);
  const [timer, setTimer] = useState(60);
  const [noInternet, setNoInternet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sendAgainDisabled) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimer(60);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sendAgainDisabled]);

  useEffect(() => {
    if (timer === 0) setSendAgainDisabled(false);
  }, [timer]);

  useEffect(() => {
    const check = async () => {
      const net = await NetInfo.fetch();
      setNoInternet(!net.isConnected);
    };
    check();
    const unsub = NetInfo.addEventListener((state) => {
      setNoInternet(!state.isConnected);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await authLogout();
    } catch {
      // Ignore sign-out errors here.
    }
  };

  const handleSendAgain = async () => {
    if (sending || !email) return;
    setSending(true);
    setError(null);
    try {
      setSendAgainDisabled(true);
      setTimer(60);
    } catch (err: unknown) {
      const code = getErrorCode(err);
      if (code === "auth/network-request-failed" || noInternet) {
        setError(t("common:no_internet"));
      } else if (code === "auth/user-not-found") {
        setError(t("common:user_not_found") ?? "User not found");
      } else {
        setError(t("common:default_error"));
      }
    }
    setSending(false);
  };

  return (
    <Layout showNavigation={false}>
      <ScreenCornerNavButton
        icon="close"
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }
          void handleLogout();
        }}
        accessibilityLabel={t("common:close", { defaultValue: "Close" })}
        containerStyle={styles.topLeftAction}
      />

      <View style={styles.iconWrapper}>
        <View style={styles.iconCard}>
          <MaterialIcons name="email" size={96} color={theme.accentSecondary} />
        </View>
      </View>
      <Text
        style={styles.title}
        accessibilityRole="header"
      >
        {t("check_mailbox_title")}
      </Text>
      <Text
        style={styles.body}
      >
        {t("check_mailbox_desc", { email })}
      </Text>
      <Text
        style={[styles.body, styles.bodySpacing]}
      >
        {t("check_mailbox_desc2")}
      </Text>
      {error && (
        <ErrorBox message={error} style={styles.error} />
      )}
      <PrimaryButton
        label={t("back_to_login")}
        onPress={handleLogout}
        style={styles.primaryButton}
      />
      <SecondaryButton
        label={
          sendAgainDisabled
            ? t("send_again_info", { seconds: timer })
            : t("send_again")
        }
        onPress={handleSendAgain}
        disabled={sending || sendAgainDisabled || noInternet}
        loading={sending}
      />
      <View style={styles.spacer} />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    topLeftAction: { top: 0, left: 0 },
    center: { alignItems: "center" },
    iconWrapper: { alignItems: "center", marginBottom: theme.spacing.xl },
    iconCard: {
      backgroundColor: theme.card,
      width: 128,
      height: 128,
      borderRadius: theme.rounded.md,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    body: {
      fontSize: theme.typography.size.base,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    bodySpacing: { marginBottom: theme.spacing.lg },
    error: { marginBottom: theme.spacing.md },
    primaryButton: { marginBottom: theme.spacing.md },
    spacer: { height: theme.spacing.md },
  });

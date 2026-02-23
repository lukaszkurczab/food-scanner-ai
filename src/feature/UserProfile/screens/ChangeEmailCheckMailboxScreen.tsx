import { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton, ErrorBox, Layout, SecondaryButton } from "@/components";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { getAuth, signOut } from "@react-native-firebase/auth";
import type { RootStackParamList } from "@/navigation/navigate";

type ChangeEmailCheckMailboxRoute = RouteProp<
  RootStackParamList,
  "ChangeEmailCheckMailbox"
>;

function getErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export default function ChangeEmailCheckMailboxScreen() {
  const { t } = useTranslation(["change_password", "common"]);
  const theme = useTheme();
  const route = useRoute<ChangeEmailCheckMailboxRoute>();

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
      const auth = getAuth();
      await signOut(auth);
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
      <View style={[styles.center, { marginBottom: theme.spacing.xl }]}>
        <View
          style={{
            backgroundColor: theme.card,
            width: 128,
            height: 128,
            borderRadius: theme.rounded.md,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MaterialIcons name="email" size={96} color={theme.accentSecondary} />
        </View>
      </View>
      <Text
        style={{
          fontSize: theme.typography.size.xxl,
          fontFamily: theme.typography.fontFamily.bold,
          color: theme.text,
          textAlign: "center",
          marginBottom: theme.spacing.md,
        }}
        accessibilityRole="header"
      >
        {t("check_mailbox_title")}
      </Text>
      <Text
        style={{
          fontSize: theme.typography.size.base,
          color: theme.textSecondary,
          textAlign: "center",
          marginBottom: theme.spacing.md,
        }}
      >
        {t("check_mailbox_desc", { email })}
      </Text>
      <Text
        style={{
          fontSize: theme.typography.size.base,
          color: theme.textSecondary,
          textAlign: "center",
          marginBottom: theme.spacing.lg,
        }}
      >
        {t("check_mailbox_desc2")}
      </Text>
      {error && (
        <ErrorBox message={error} style={{ marginBottom: theme.spacing.md }} />
      )}
      <PrimaryButton
        label={t("back_to_login")}
        onPress={handleLogout}
        style={{ marginBottom: theme.spacing.md }}
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
      <View style={{ height: theme.spacing.md }} />
    </Layout>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
});

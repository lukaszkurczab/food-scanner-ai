import { useMemo, useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton, ErrorBox, Layout, SecondaryButton } from "@/components";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { MaterialIcons } from "@expo/vector-icons";
import { getFirebaseAuth } from "@/FirebaseConfig";
import { authSendPasswordReset } from "@/feature/Auth/services/authService";
import type { RootStackParamList } from "@/navigation/navigate";

type CheckMailboxRoute = RouteProp<RootStackParamList, "CheckMailbox">;
type CheckMailboxNavigation = StackNavigationProp<RootStackParamList>;
type Props = {
  navigation: CheckMailboxNavigation;
};

function getErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export default function CheckMailboxScreen({ navigation }: Props) {
  const { t } = useTranslation("resetPassword");
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const route = useRoute<CheckMailboxRoute>();

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

  const handleSendAgain = async () => {
    if (sending || !email) return;
    setSending(true);
    setError(null);
    try {
      await getFirebaseAuth();
      await authSendPasswordReset(email.trim().toLowerCase());
      setSendAgainDisabled(true);
      setTimer(60);
    } catch (err: unknown) {
      const code = getErrorCode(err);
      if (code === "auth/network-request-failed" || noInternet) {
        setError(t("errorNoInternet"));
      } else if (code === "auth/user-not-found") {
        setError(t("errorNotFound") ?? "User not found");
      } else {
        setError(t("errorDefault"));
      }
    }
    setSending(false);
  };

  return (
    <Layout showNavigation={false}>
      <View style={styles.illustrationWrap}>
        <View style={styles.iconCard}>
          <MaterialIcons
            name="email"
            size={128}
            color={theme.accentSecondary}
          />
        </View>
      </View>
      <Text
        style={styles.title}
        accessibilityRole="header"
      >
        {t("checkMailboxTitle")}
      </Text>
      <Text
        style={styles.subtitle}
      >
        {t("checkMailboxDesc", {
          email: email.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
        })}
      </Text>
      <Text
        style={styles.subtitleWide}
      >
        {t("successGeneric")}
      </Text>
      {error && (
        <ErrorBox message={error} style={styles.errorSpacing} />
      )}
      <PrimaryButton
        label={t("backToLogin")}
        onPress={() => navigation.navigate("Login")}
        style={styles.actionSpacing}
      />
      <SecondaryButton
        label={
          sendAgainDisabled
            ? t("sendAgainInfo", { seconds: timer })
            : t("sendAgain")
        }
        onPress={handleSendAgain}
        disabled={sending || sendAgainDisabled || noInternet}
        loading={sending}
      />
      <View style={styles.bottomSpacer} />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    illustrationWrap: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
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
    subtitle: {
      fontSize: theme.typography.size.base,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    subtitleWide: {
      fontSize: theme.typography.size.base,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
    },
    errorSpacing: { marginBottom: theme.spacing.md },
    actionSpacing: { marginBottom: theme.spacing.md },
    bottomSpacer: { height: theme.spacing.md },
  });

import React, { useState, useEffect, useRef } from "react";
import { View, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import {
  PrimaryButton,
  ErrorBox,
  Layout,
  SecondaryButton,
} from "@/src/components";
import { useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { getFirebaseAuth } from "@/src/FirebaseConfig";

export default function CheckMailboxScreen({ navigation }: any) {
  const { t } = useTranslation("resetPassword");
  const theme = useTheme();
  const route = useRoute<any>();

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
      const auth = await getFirebaseAuth();
      await auth.sendPasswordResetEmail(email.trim().toLowerCase());
      setSendAgainDisabled(true);
      setTimer(60);
    } catch (err: any) {
      if (err.code === "auth/network-request-failed" || noInternet) {
        setError(t("errorNoInternet"));
      } else if (err.code === "auth/user-not-found") {
        setError(t("errorNotFound") ?? "User not found");
      } else {
        setError(t("errorDefault"));
      }
    }
    setSending(false);
  };

  return (
    <Layout showNavigation={false}>
      <View style={{ alignItems: "center", marginBottom: theme.spacing.xl }}>
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
          <MaterialIcons
            name="email"
            size={128}
            color={theme.accentSecondary}
          />
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
        {t("checkMailboxTitle")}
      </Text>
      <Text
        style={{
          fontSize: theme.typography.size.base,
          color: theme.textSecondary,
          textAlign: "center",
          marginBottom: theme.spacing.md,
        }}
      >
        {t("checkMailboxDesc", {
          email: email.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
        })}
      </Text>
      <Text
        style={{
          fontSize: theme.typography.size.base,
          color: theme.textSecondary,
          textAlign: "center",
          marginBottom: theme.spacing.lg,
        }}
      >
        {t("successGeneric")}
      </Text>
      {error && (
        <ErrorBox message={error} style={{ marginBottom: theme.spacing.md }} />
      )}
      <PrimaryButton
        label={t("backToLogin")}
        onPress={() => navigation.navigate("Login")}
        style={{ marginBottom: theme.spacing.md }}
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
      <View style={{ height: theme.spacing.md }} />
    </Layout>
  );
}

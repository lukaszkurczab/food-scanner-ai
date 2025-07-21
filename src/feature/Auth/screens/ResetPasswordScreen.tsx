import React, { useState, useRef, useEffect } from "react";
import { View, Keyboard, Platform, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import { auth } from "@/src/FirebaseConfig";
import {
  PrimaryButton,
  TextInput,
  LinkText,
  ErrorBox,
  Layout,
} from "@/src/components";
import { validateEmail } from "@/src/utils/validation";

export default function ResetPasswordScreen({ navigation }: any) {
  const { t } = useTranslation("resetPassword");
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [noInternet, setNoInternet] = useState(false);

  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (inputRef.current && Platform.OS !== "web") {
      setTimeout(() => inputRef.current.focus(), 300);
    }
  }, []);

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

  const handleBlur = () => {
    setEmail((e) => e.trim().toLowerCase());
    setTouched(true);
  };

  useEffect(() => {
    if (!touched) return;
    if (!email) setError(t("errorRequired"));
    else if (!validateEmail(email)) setError(t("errorInvalid"));
    else setError(null);
  }, [email, touched]);

  const onSubmit = async () => {
    Keyboard.dismiss();
    setTouched(true);
    if (!email) {
      setError(t("errorRequired"));
      return;
    }
    if (!validateEmail(email)) {
      setError(t("errorInvalid"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await auth().sendPasswordResetEmail(email.trim().toLowerCase());
      setLoading(false);
      navigation.navigate("CheckMailbox", {
        email: email.trim().toLowerCase(),
      });
    } catch (err: any) {
      setLoading(false);
      if (err.code === "auth/network-request-failed" || noInternet) {
        setError(t("errorNoInternet"));
      } else {
        console.log(err);
      }
    }
  };

  useEffect(() => {
    if (error) setError(null);
  }, [email]);

  return (
    <Layout>
      {noInternet && (
        <View
          style={{
            backgroundColor: theme.error.background,
            borderColor: theme.error.border,
            borderWidth: 1,
            padding: theme.spacing.md,
            borderRadius: theme.rounded.sm,
            marginBottom: theme.spacing.lg,
          }}
          accessible
          accessibilityRole="alert"
        >
          <ErrorBox message={t("errorNoInternet")} />
        </View>
      )}
      <View style={{ marginBottom: theme.spacing.lg }}>
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
          {t("title")}
        </Text>
        <Text
          style={{
            fontSize: theme.typography.size.base,
            color: theme.textSecondary,
            textAlign: "center",
          }}
        >
          {t("description")}
        </Text>
      </View>
      <TextInput
        ref={inputRef}
        label={t("email")}
        placeholder={t("emailPlaceholder")}
        value={email}
        onChangeText={setEmail}
        onBlur={handleBlur}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        error={touched && error ? error : undefined}
        disabled={loading || noInternet}
        accessibilityLabel={t("email")}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        style={{ marginBottom: theme.spacing.md }}
      />
      <PrimaryButton
        label={t("resetBtn")}
        onPress={onSubmit}
        loading={loading}
        disabled={
          loading || noInternet || !email || !!error || !validateEmail(email)
        }
        accessibilityLabel={t("resetBtn")}
        style={{ marginVertical: theme.spacing.md }}
      />
      <View style={{ alignItems: "center", marginTop: theme.spacing.lg }}>
        <Text>{t("rememberPassword")} </Text>
        <LinkText
          onPress={() => navigation.navigate("Login")}
          accessibilityRole="link"
        >
          <Text style={{ color: theme.link }}>{t("login")}</Text>
        </LinkText>
      </View>
    </Layout>
  );
}

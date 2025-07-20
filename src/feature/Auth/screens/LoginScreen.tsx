import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import {
  TextInput,
  PrimaryButton,
  ErrorBox,
  LinkText,
  Layout,
} from "@/src/components";
import { useLogin } from "@/src/feature/Auth/hooks/useLogin";
import NetInfo from "@react-native-community/netinfo";
import { validateEmail } from "@/src/utils/validation";
import { Feather } from "@expo/vector-icons";

export default function LoginScreen({ navigation }: any) {
  const { t } = useTranslation(["login", "common"]);
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [internetError, setInternetError] = useState(false);

  const { login, loading, errors, criticalError, reset } = useLogin(t);

  useEffect(() => {
    reset();
  }, []);

  useEffect(() => {
    reset();
  }, [email, password]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setInternetError(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const emailError =
    touched.email && !validateEmail(email) ? t("invalid_email") : errors.email;
  const passwordError =
    touched.password && password.length < 6
      ? t("invalid_password")
      : errors.password;

  const isFormValid = !!email && !!password && !emailError && !passwordError;

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    if (!isFormValid) return;
    await login(email.trim(), password);
  };

  let displayCriticalError = criticalError;
  if (internetError) displayCriticalError = t("no_internet");

  const isLoginDisabled = !isFormValid || loading || !!displayCriticalError;

  return (
    <Layout>
      {displayCriticalError && <ErrorBox message={displayCriticalError} />}

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.xxl,
            textAlign: "center",
            marginBottom: theme.spacing.xxl,
          }}
        >
          {t("common:app_title")}
        </Text>

        <TextInput
          label={t("email")}
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={emailError}
          editable={!loading && !displayCriticalError}
          placeholder={t("enter_email")}
          accessibilityLabel={t("email")}
          style={{ marginBottom: theme.spacing.xl }}
        />

        <TextInput
          label={t("password")}
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          error={passwordError}
          editable={!loading && !displayCriticalError}
          placeholder={t("enter_password")}
          accessibilityLabel={t("password")}
          style={{ marginBottom: theme.spacing.xl }}
          icon={
            <Pressable onPress={() => setShowPassword((v) => !v)}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={22} />
            </Pressable>
          }
          iconPosition="right"
        />

        <PrimaryButton
          label={t("login")}
          onPress={handleLogin}
          disabled={isLoginDisabled}
          loading={loading}
          style={{ marginBottom: theme.spacing.xl }}
        />

        <LinkText
          onPress={() => navigation.navigate("ForgotPassword")}
          disabled={loading}
          style={{ alignSelf: "center", marginBottom: theme.spacing.xl }}
        >
          {t("forgot_password")}
        </LinkText>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: theme.typography.size.sm,
              fontFamily: theme.typography.fontFamily.regular,
            }}
          >
            {t("dont_have_account")}{" "}
          </Text>
          <LinkText
            style={{
              fontFamily: theme.typography.fontFamily.bold,
            }}
            onPress={() => navigation.navigate("Register")}
            disabled={loading}
          >
            {t("sign_up")}
          </LinkText>
        </View>
      </View>
    </Layout>
  );
}

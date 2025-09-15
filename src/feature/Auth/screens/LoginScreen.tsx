import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import {
  TextInput,
  PrimaryButton,
  ErrorBox,
  LinkText,
  Layout,
} from "@/components";
import NetInfo from "@react-native-community/netinfo";
import { validateEmail } from "@/utils/validation";
import { Feather } from "@expo/vector-icons";
import { useAuthContext } from "@/context/AuthContext";
import { useLogin } from "@/feature/Auth/hooks/useLogin";

export default function LoginScreen({ navigation }: any) {
  const { t } = useTranslation(["login", "common"]);
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [internetError, setInternetError] = useState(false);

  const { setFirebaseUser } = useAuthContext();
  const { login, loading, errors, criticalError, reset } =
    useLogin(setFirebaseUser);

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
    touched.email && !validateEmail(email)
      ? t("invalid_email")
      : errors.email
      ? t(errors.email, { defaultValue: t("invalid_email") })
      : undefined;
  const passwordError =
    touched.password && password.length < 6
      ? t("invalid_password")
      : errors.password
      ? t(errors.password, { defaultValue: t("invalid_password") })
      : undefined;

  const isFormValid = !!email && !!password && !emailError && !passwordError;

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    if (!isFormValid) return;
    await login(email.trim(), password);
  };

  const mapCritical = (key: string | null): string | null => {
    if (!key) return null;
    if (key === "no_internet") return t("common:no_internet");
    if (key === "too_many_requests") return t("too_many_requests");
    if (key === "login_failed") return t("login_failed");
    return t("login_failed");
  };
  const displayCriticalError: string | null = internetError
    ? t("common:no_internet")
    : mapCritical(criticalError);

  const isLoginDisabled = !isFormValid || loading || internetError;

  return (
    <Layout showNavigation={false}>
      {displayCriticalError && <ErrorBox message={displayCriticalError} />}

      <View style={styles.centerColumn}>
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
          editable={!loading}
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
          editable={!loading}
          placeholder={t("enter_password")}
          accessibilityLabel={t("password")}
          style={{ marginBottom: theme.spacing.xl }}
          icon={
            <Pressable onPress={() => setShowPassword((v) => !v)}>
              <Feather
                name={showPassword ? "eye" : "eye-off"}
                size={22}
                color={theme.text}
              />
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
          onPress={() => navigation.navigate("ResetPassword")}
          disabled={loading}
          style={{ alignSelf: "center", marginBottom: theme.spacing.xl }}
        >
          {t("forgot_password")}
        </LinkText>
      </View>
      <View style={styles.rowCenter}>
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
          onPress={() => navigation.navigate("Register")}
          disabled={loading}
        >
          {t("sign_up")}
        </LinkText>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  centerColumn: { flex: 1, justifyContent: "center" },
  rowCenter: { flexDirection: "row", justifyContent: "center" },
  selfCenter: { alignSelf: "center" },
});

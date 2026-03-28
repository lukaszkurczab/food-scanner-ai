import { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { Button, TextInput, ErrorBox, LinkText } from "@/components";
import NetInfo from "@react-native-community/netinfo";
import { validateEmail } from "@/utils/validation";
import AppIcon from "@/components/AppIcon";
import { useAuthContext } from "@/context/AuthContext";
import { useLogin } from "@/feature/Auth/hooks/useLogin";
import { AuthScreenLayout } from "@/feature/Auth/components/AuthScreenLayout";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

type LoginNavigation = StackNavigationProp<RootStackParamList, "Login">;

type LoginScreenProps = {
  navigation: LoginNavigation;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { t } = useTranslation(["login", "common"]);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
  }, [reset]);

  useEffect(() => {
    reset();
  }, [email, password, reset]);

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
    <AuthScreenLayout
      title={t("common:app_title")}
      subtitle={t("welcome_back")}
      banner={
        displayCriticalError ? (
          <ErrorBox message={displayCriticalError} />
        ) : null
      }
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>{t("dont_have_account")} </Text>
          <LinkText
            onPress={() => navigation.navigate("Register")}
            disabled={loading}
          >
            {t("sign_up")}
          </LinkText>
        </View>
      }
    >
      <View style={styles.formSection}>
        <TextInput
          testID="login-email-input"
          label={t("email")}
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={emailError}
          editable={!loading}
          placeholder={t("enter_email")}
          accessibilityLabel={t("email")}
          style={styles.emailField}
        />

        <View style={styles.passwordSection}>
          <TextInput
            testID="login-password-input"
            label={t("password")}
            value={password}
            onChangeText={setPassword}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            error={passwordError}
            editable={!loading}
            placeholder={t("enter_password")}
            accessibilityLabel={t("password")}
            style={styles.passwordField}
            icon={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityLabel={t("toggle_password_visibility")}
              >
                <AppIcon
                  name={showPassword ? "eye" : "eye-off"}
                  size={22}
                  color={theme.textSecondary}
                />
              </Pressable>
            }
            iconPosition="right"
          />

          <LinkText
            onPress={() => navigation.navigate("ResetPassword")}
            disabled={loading}
            style={styles.forgotPasswordLink}
          >
            {t("forgot_password")}
          </LinkText>
        </View>
      </View>

      <Button
        testID="login-submit-button"
        label={t("login")}
        onPress={handleLogin}
        disabled={isLoginDisabled}
        loading={loading}
        style={styles.cta}
      />
    </AuthScreenLayout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    formSection: {
      width: "100%",
      flexGrow: 1,
    },
    emailField: {
      marginBottom: theme.spacing.md,
    },
    passwordSection: {
      marginBottom: theme.spacing.sectionGap,
    },
    passwordField: {
      marginBottom: theme.spacing.xxs,
    },
    forgotPasswordLink: {
      alignSelf: "flex-end",
    },
    cta: {
      marginTop: theme.spacing.xs,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap",
    },
    footerText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });

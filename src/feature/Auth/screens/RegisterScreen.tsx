import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Keyboard,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import { useTheme } from "@/theme/useTheme";
import {
  TextInput,
  PrimaryButton,
  ErrorBox,
  LinkText,
  Layout,
  Checkbox,
} from "@/components";
import { Feather } from "@expo/vector-icons";
import { useAuthContext } from "@/context/AuthContext";
import { useRegister } from "@/feature/Auth/hooks/useRegister";
import { validateEmail } from "@/utils/validation";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

type RegisterNavigation = StackNavigationProp<RootStackParamList, "Register">;

type RegisterScreenProps = {
  navigation: RegisterNavigation;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { t } = useTranslation(["login", "common"]);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [emailValidated, setEmailValidated] = useState(true);

  const [emailTouched, setEmailTouched] = useState(false);

  const { setFirebaseUser } = useAuthContext();
  const { register, loading, errors, clearError } =
    useRegister(setFirebaseUser);

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected === true);
    });
    return () => unsubscribe();
  }, []);

  const handleValidateEmail = () => {
    setEmailTouched(true);
    const val = validateEmail(email);
    setEmailValidated(val);
  };

  const emailLiveError =
    email && !emailValidated ? t("invalid_email") : undefined;

  const isFormDisabled =
    !username ||
    !email ||
    !password ||
    !confirmPassword ||
    !termsAccepted ||
    loading ||
    !isConnected ||
    !!emailLiveError;

  const handleSubmit = () => {
    setEmailTouched(true);
    Keyboard.dismiss();
    register(
      email.trim(),
      password,
      confirmPassword,
      username.trim(),
      termsAccepted
    );
  };

  const renderEyeIcon = (show: boolean, toggle: () => void) => (
    <TouchableOpacity
      onPress={toggle}
      accessibilityLabel={t("toggle_password_visibility")}
    >
      <Feather name={!show ? "eye-off" : "eye"} size={22} color={theme.text} />
    </TouchableOpacity>
  );

  return (
    <Layout showNavigation={false} keyboardAvoiding={Platform.OS !== "ios"}>
      <View style={styles.centerBoth}>
        <Text style={styles.title}>
          {t("common:app_title")}
        </Text>

        {!isConnected && <ErrorBox message={t("common:no_internet")} />}
        {errors.general && <ErrorBox message={t(errors.general)} />}

        <TextInput
          label={t("username")}
          value={username}
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          placeholder={t("enter_username")}
          onChangeText={(val) => {
            setUsername(val);
            clearError("username");
          }}
          error={errors.username ? t(errors.username) : undefined}
          accessibilityLabel={t("username")}
          style={styles.fieldSpacing}
        />

        <TextInput
          label={t("email", { ns: "login" })}
          value={email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder={t("enter_email", { ns: "login" })}
          onChangeText={(val) => {
            setEmail(val);
          }}
          onBlur={handleValidateEmail}
          error={
            (emailTouched && emailLiveError) ||
            (errors.email ? t(errors.email) : undefined)
          }
          accessibilityLabel={t("email", { ns: "login" })}
          style={styles.fieldSpacing}
        />

        <TextInput
          label={t("password", { ns: "login" })}
          value={password}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder={t("enter_password", { ns: "login" })}
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
          error={errors.password ? t(errors.password) : undefined}
          accessibilityLabel={t("password", { ns: "login" })}
          icon={renderEyeIcon(showPassword, () => setShowPassword((v) => !v))}
          iconPosition="right"
          style={styles.fieldSpacing}
        />

        <TextInput
          label={t("confirm_password")}
          value={confirmPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder={t("enter_confirm_password")}
          secureTextEntry={!showConfirm}
          onChangeText={setConfirmPassword}
          error={errors.confirmPassword ? t(errors.confirmPassword) : undefined}
          accessibilityLabel={t("confirm_password")}
          icon={renderEyeIcon(showConfirm, () => setShowConfirm((v) => !v))}
          iconPosition="right"
          style={styles.fieldSpacing}
        />

        <View style={styles.termsRow}>
          <Checkbox
            checked={termsAccepted}
            onChange={setTermsAccepted}
            accessibilityLabel={t("accept_terms")}
          />
          <View style={styles.rowJustifyCenter}>
            <Text style={styles.helperText}>
              {t("accept_terms")}{" "}
            </Text>
            <LinkText
              text={t("terms")}
              onPress={() => navigation.navigate("Terms")}
            />
            <Text style={styles.helperText}>
              {" & "}
            </Text>
            <LinkText
              text={t("privacy_policy")}
              onPress={() => navigation.navigate("Privacy")}
            />
          </View>
        </View>

        {errors.terms && (
          <Text style={styles.termsError}>
            {t(errors.terms)}
          </Text>
        )}

        <PrimaryButton
          label={t("sign_up")}
          onPress={handleSubmit}
          disabled={isFormDisabled}
          loading={loading}
          style={styles.submitSpacing}
        />
      </View>

      <View style={styles.rowJustifyCenter}>
        <Text style={styles.helperText}>
          {t("already_have_account")}{" "}
        </Text>
        <LinkText
          text={t("sign_in")}
          onPress={() => navigation.replace("Login")}
        />
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    centerBoth: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
    rowJustifyCenter: { flexDirection: "row", justifyContent: "center" },
    title: {
      fontSize: theme.typography.size.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      marginBottom: theme.spacing.lg,
      textAlign: "center",
    },
    fieldSpacing: { marginBottom: theme.spacing.md },
    termsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.md,
    },
    helperText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
    },
    termsError: {
      color: theme.error.text,
      fontSize: theme.typography.size.xs,
      marginTop: theme.spacing.xs,
    },
    submitSpacing: { marginTop: theme.spacing.xl },
  });

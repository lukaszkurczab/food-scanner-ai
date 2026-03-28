import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Keyboard,
  Pressable,
  Linking,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import { useTheme } from "@/theme/useTheme";
import { Button, TextInput, ErrorBox, LinkText, Checkbox } from "@/components";
import AppIcon from "@/components/AppIcon";
import { useAuthContext } from "@/context/AuthContext";
import { useRegister } from "@/feature/Auth/hooks/useRegister";
import { validateEmail } from "@/utils/validation";
import { getTermsUrl } from "@/utils/legalUrls";
import { AuthScreenLayout } from "@/feature/Auth/components/AuthScreenLayout";
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
    setEmailValidated(validateEmail(email));
  };

  const clearFieldError = (
    key: "email" | "username" | "password" | "confirmPassword" | "terms",
  ) => {
    clearError(key);
    clearError("general");
  };

  const emailLiveError =
    emailTouched && email && !emailValidated ? t("invalid_email") : undefined;

  const isFormDisabled =
    !username.trim() ||
    !email.trim() ||
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
      termsAccepted,
    );
  };

  const renderEyeIcon = (show: boolean, toggle: () => void) => (
    <Pressable
      onPress={toggle}
      accessibilityLabel={t("toggle_password_visibility")}
      hitSlop={8}
    >
      <AppIcon
        name={!show ? "eye-off" : "eye"}
        size={22}
        color={theme.textSecondary}
      />
    </Pressable>
  );

  return (
    <AuthScreenLayout
      title={t("common:app_title")}
      subtitle={t("create_account")}
      heroVariant="compact"
      banner={
        !isConnected ? (
          <ErrorBox message={t("common:no_internet")} />
        ) : errors.general ? (
          <ErrorBox message={t(errors.general)} />
        ) : null
      }
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.helperText}>{t("already_have_account")} </Text>
          <LinkText
            text={t("sign_in")}
            onPress={() => navigation.replace("Login")}
          />
        </View>
      }
    >
      <View style={styles.formSection}>
        <TextInput
          label={t("username")}
          value={username}
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          placeholder={t("enter_username")}
          onChangeText={(val) => {
            setUsername(val);
            clearFieldError("username");
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
            if (emailTouched) setEmailValidated(validateEmail(val));
            clearFieldError("email");
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
          onChangeText={(val) => {
            setPassword(val);
            clearFieldError("password");
          }}
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
          onChangeText={(val) => {
            setConfirmPassword(val);
            clearFieldError("confirmPassword");
          }}
          error={errors.confirmPassword ? t(errors.confirmPassword) : undefined}
          accessibilityLabel={t("confirm_password")}
          icon={renderEyeIcon(showConfirm, () => setShowConfirm((v) => !v))}
          iconPosition="right"
          style={styles.confirmField}
        />

        <View style={styles.legalSection}>
          <View style={styles.termsRow}>
            <Checkbox
              checked={termsAccepted}
              onChange={(checked) => {
                setTermsAccepted(checked);
                clearFieldError("terms");
              }}
              error={Boolean(errors.terms)}
              accessibilityLabel={
                errors.terms ? t(errors.terms) : t("accept_terms")
              }
              style={styles.termsCheckbox}
            />
            <View style={styles.termsCopy}>
              <View style={styles.termsLine}>
                <Text
                  style={[
                    styles.helperText,
                    errors.terms ? styles.termsTextError : null,
                  ]}
                >
                  {t("accept_terms")}{" "}
                </Text>
                <LinkText
                  text={t("terms")}
                  style={errors.terms ? styles.termsLinkError : undefined}
                  onPress={() => {
                    const url = getTermsUrl();
                    if (url) void Linking.openURL(url);
                  }}
                />
                <Text
                  style={[
                    styles.helperText,
                    errors.terms ? styles.termsTextError : null,
                  ]}
                >
                  {" & "}
                </Text>
                <LinkText
                  text={t("privacy_policy")}
                  style={errors.terms ? styles.termsLinkError : undefined}
                  onPress={() => navigation.navigate("Privacy")}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
      <Button
        label={t("sign_up")}
        onPress={handleSubmit}
        disabled={isFormDisabled}
        loading={loading}
        style={styles.submitSpacing}
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
    footerRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap",
    },
    fieldSpacing: {
      marginBottom: theme.spacing.sm + 2,
    },
    confirmField: {
      marginBottom: theme.spacing.lg,
    },
    legalSection: {
      marginBottom: theme.spacing.sectionGap,
    },
    termsRow: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
    },
    termsCheckbox: {
      marginRight: theme.spacing.sm,
      alignSelf: "flex-start",
      marginTop: 1,
    },
    termsCopy: {
      flex: 1,
      minHeight: 24,
      justifyContent: "center",
    },
    termsLine: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    helperText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.regular,
    },
    termsTextError: {
      color: theme.error.text,
    },
    termsLinkError: {
      color: theme.error.text,
    },
    submitSpacing: {
      marginTop: theme.spacing.sm,
    },
  });

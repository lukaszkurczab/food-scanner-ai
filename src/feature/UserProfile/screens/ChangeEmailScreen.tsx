import React, { useState } from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import {
  Layout,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  ErrorBox,
} from "@/src/components";

function mapFirebaseErrorToKey(code: string): string {
  switch (code) {
    case "auth/wrong-password":
      return "invalid_password";
    case "auth/too-many-requests":
      return "too_many_requests";
    case "auth/email-already-in-use":
      return "email_in_use";
    case "auth/invalid-email":
      return "invalid_email";
    case "auth/not-logged-in":
      return "invalid_password";
    default:
      return "invalid_password";
  }
}

// Zastąpić prawdziwą logiką z contextu/hooków/serwisów!
const mockChangeEmail = async (_email: string, _password: string) => {
  return Promise.resolve();
};

export default function ChangeEmailScreen({ navigation }: any) {
  const { t } = useTranslation(["profile", "login"]);
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Możesz dodać walidację formatu email, np. z utils/validation
  const validateEmail = (v: string) => /\S+@\S+\.\S+/.test(v);

  const validate = async () => {
    let newErrors: { email?: string; password?: string } = {};

    if (!email) newErrors.email = t("enter_email", { ns: "login" });
    else if (!validateEmail(email))
      newErrors.email = t("invalid_email", { ns: "login" });
    // Tu można dodać sprawdzanie, czy email już zajęty (po stronie serwisu)
    if (!password)
      newErrors.password = t("passwordRequired", { ns: "profile" });

    setErrors(newErrors);
    return Object.keys(newErrors).length ? newErrors : null;
  };

  const onSubmit = async () => {
    setTouched({ email: true, password: true });
    setCriticalError(null);
    setLoading(true);

    const validationErrors = await validate();
    if (validationErrors) {
      setLoading(false);
      return;
    }

    try {
      // Podmień na swoją logikę (np. z contextu)
      await mockChangeEmail(email.trim(), password);
      navigation.goBack();
    } catch (e: any) {
      let errKey = "login_failed";
      if (e && typeof e.code === "string") {
        errKey = mapFirebaseErrorToKey(e.code);
      }
      if (errKey === "invalid_password") {
        setErrors((old) => ({
          ...old,
          password: t("invalid_password", { ns: "login" }),
        }));
        setCriticalError(null);
      } else if (errKey === "email_in_use" || errKey === "invalid_email") {
        setErrors((old) => ({
          ...old,
          email: t(errKey, { ns: "login" }),
        }));
        setCriticalError(null);
      } else {
        setCriticalError(t(errKey, { ns: "login" }));
      }
    }
    setLoading(false);
  };

  return (
    <Layout>
      {criticalError && (
        <ErrorBox message={criticalError} style={{ marginBottom: 12 }} />
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
          {t("changeEmail", { ns: "profile" })}
        </Text>
      </View>
      <Text style={{ fontWeight: "bold", color: theme.text, marginBottom: 8 }}>
        {t("newEmail", { ns: "profile" })}
      </Text>
      <TextInput
        value={email}
        onChangeText={(val) => {
          setEmail(val);
          setErrors((e) => ({ ...e, email: undefined }));
        }}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        placeholder={t("email", { ns: "login" })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        error={touched.email ? errors.email : undefined}
        disabled={loading}
        style={{ marginBottom: 16 }}
      />

      <Text style={{ fontWeight: "bold", color: theme.text, marginBottom: 8 }}>
        {t("password", { ns: "profile" })}
      </Text>
      <TextInput
        value={password}
        onChangeText={(val) => {
          setPassword(val);
          setErrors((e) => ({ ...e, password: undefined }));
        }}
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        placeholder={t("passwordPlaceholder", { ns: "profile" })}
        secureTextEntry
        error={touched.password ? errors.password : undefined}
        disabled={loading}
        style={{ marginBottom: 32 }}
      />

      <Text
        style={{
          color: theme.textSecondary,
          textAlign: "center",
          fontSize: theme.typography.size.sm,
          marginBottom: theme.spacing.xl,
        }}
      >
        {t("emailChangeSecurityNote", {
          ns: "profile",
          defaultValue:
            "You may be asked to log in again for security reasons.",
        })}
      </Text>

      <View style={{ gap: 16 }}>
        <PrimaryButton
          label={t("confirm", { ns: "profile" })}
          onPress={onSubmit}
          loading={loading}
          disabled={
            loading ||
            !email ||
            !password ||
            (touched.email && !!errors.email) ||
            (touched.password && !!errors.password)
          }
        />
        <SecondaryButton
          label={t("cancel", { ns: "profile" })}
          onPress={() => navigation.goBack()}
          disabled={loading}
        />
      </View>
    </Layout>
  );
}

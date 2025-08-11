import React, { useState } from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@contexts/UserContext";
import {
  PrimaryButton,
  TextInput,
  Layout,
  ErrorBox,
  SecondaryButton,
} from "@/components";
import {
  isUsernameAvailable,
  normalizeUsername,
} from "@/services/usernameService";

function mapFirebaseErrorToKey(code: string): string {
  switch (code) {
    case "auth/wrong-password":
      return "invalid_password";
    case "auth/too-many-requests":
      return "too_many_requests";
    case "auth/user-not-found":
      return "invalid_email_or_password";
    case "auth/not-logged-in":
      return "invalid_password";
    case "username/unavailable":
      return "usernameTaken";
    default:
      return "invalid_password";
  }
}

export default function UsernameChangeScreen({ navigation }: any) {
  const { t } = useTranslation(["profile", "login"]);
  const theme = useTheme();
  const { changeUsername, userData } = useUserContext();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ username: false, password: false });
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    const newErrors: { username?: string; password?: string } = {};
    const candidate = normalizeUsername(username);

    if (!candidate) {
      newErrors.username = t("usernameRequired", { ns: "profile" });
    } else if (candidate.length < 3) {
      newErrors.username = t("usernameTooShort", { ns: "profile" });
    } else {
      const available = await isUsernameAvailable(candidate, userData?.uid);
      if (!available)
        newErrors.username = t("usernameTaken", { ns: "profile" });
    }

    if (!password)
      newErrors.password = t("passwordRequired", { ns: "profile" });

    setErrors(newErrors);
    return Object.keys(newErrors).length ? newErrors : null;
  };

  const onSubmit = async () => {
    setTouched({ username: true, password: true });
    setCriticalError(null);
    setLoading(true);

    const validationErrors = await validate();
    if (validationErrors) {
      setLoading(false);
      return;
    }

    try {
      await changeUsername(normalizeUsername(username), password);
      navigation.goBack();
    } catch (e: any) {
      let errKey = "login_failed";
      if (e && typeof e.code === "string")
        errKey = mapFirebaseErrorToKey(e.code);

      if (errKey === "invalid_password") {
        setErrors((old) => ({
          ...old,
          password: t("invalid_password", { ns: "login" }),
        }));
        setCriticalError(null);
      } else if (errKey === "usernameTaken") {
        setErrors((old) => ({
          ...old,
          username: t("usernameTaken", { ns: "profile" }),
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
          {t("changeUsername", { ns: "profile" })}
        </Text>
      </View>

      <Text style={{ fontWeight: "bold", color: theme.text, marginBottom: 8 }}>
        {t("newUsername", { ns: "profile" })}
      </Text>
      <TextInput
        value={username}
        onChangeText={(val) => {
          setUsername(val);
          setErrors((e) => ({ ...e, username: undefined }));
        }}
        onBlur={() => setTouched((t) => ({ ...t, username: true }))}
        placeholder={t("newUsernamePlaceholder", { ns: "profile" })}
        autoCapitalize="none"
        autoCorrect={false}
        error={touched.username ? errors.username : undefined}
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

      <View style={{ gap: 16 }}>
        <PrimaryButton
          label={t("confirm", { ns: "profile" })}
          onPress={onSubmit}
          loading={loading}
          disabled={loading || !username || username.length < 3 || !password}
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

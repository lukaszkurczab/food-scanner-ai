import React, { useState } from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import { isUsernameAvailable } from "@/src/services/firestore/firestoreUserService";
import {
  PrimaryButton,
  TextInput,
  Layout,
  ErrorBox,
  SecondaryButton,
} from "@/src/components";

export default function UsernameChangeScreen({ navigation }: any) {
  const { t } = useTranslation("profile");
  const theme = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    if (!username) return t("usernameRequired");
    if (username.length < 3) return t("usernameTooShort");
    const available = await isUsernameAvailable(username.trim());
    if (!available) return t("usernameTaken");
    if (!password) return t("passwordRequired");
    return null;
  };

  const onSubmit = async () => {
    setTouched(true);
    setLoading(true);
    const err = await validate();
    setError(err);
    if (err) {
      setLoading(false);
      return;
    }
    try {
      // ...tu update username + sprawdzenie hasła itd.
      navigation.goBack();
    } catch (e) {
      setError(t("errorGeneric"));
    }
    setLoading(false);
  };

  return (
    <Layout>
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
          {t("changeUsername")}
        </Text>
      </View>
      <Text style={{ fontWeight: "bold", color: theme.text, marginBottom: 8 }}>
        {t("newUsername")}
      </Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder={t("newUsernamePlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        error={
          touched && error && error.includes("username") ? error : undefined
        }
        disabled={loading}
        style={{ marginBottom: 16 }}
      />
      <Text style={{ fontWeight: "bold", color: theme.text, marginBottom: 8 }}>
        {t("password")}
      </Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={t("passwordPlaceholder")}
        secureTextEntry
        error={
          touched && error && error.includes("password") ? error : undefined
        }
        disabled={loading}
        style={{ marginBottom: 32 }}
      />
      <View style={{ gap: 16 }}>
        <PrimaryButton
          label={t("confirm")}
          onPress={onSubmit}
          loading={loading}
          disabled={loading || !username || username.length < 3 || !password}
        />
        <SecondaryButton
          label={t("cancel")}
          onPress={() => navigation.goBack()}
          disabled={loading}
        />
      </View>
      {error && <ErrorBox message={error} style={{ marginTop: 12 }} />}
    </Layout>
  );
}

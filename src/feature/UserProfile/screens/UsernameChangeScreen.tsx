import { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@contexts/UserContext";
import { BackTitleHeader, TextInput, Layout, ErrorBox } from "@/components";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";
import {
  isUsernameAvailable,
  normalizeUsername,
} from "@/services/user/usernameService";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

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

type UsernameChangeNavigation = StackNavigationProp<RootStackParamList>;
type Props = {
  navigation: UsernameChangeNavigation;
};

function getErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export default function UsernameChangeScreen({ navigation }: Props) {
  const { t } = useTranslation(["profile", "login"]);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
    } catch (e: unknown) {
      let errKey = "login_failed";
      const code = getErrorCode(e);
      if (code) errKey = mapFirebaseErrorToKey(code);

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
    <Layout disableScroll>
      <View style={styles.container}>
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {criticalError && (
            <ErrorBox message={criticalError} style={styles.error} />
          )}

          <BackTitleHeader
            title={t("changeUsername", { ns: "profile" })}
            onBack={() => navigation.goBack()}
          />

          <Text style={styles.label}>
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
            autoCorrect={false}
            error={touched.username ? errors.username : undefined}
            disabled={loading}
            style={styles.input}
          />

          <Text style={styles.label}>{t("password", { ns: "profile" })}</Text>
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
            style={styles.inputLarge}
          />
        </ScrollView>

        <View style={styles.actions}>
          <GlobalActionButtons
            label={t("confirm", { ns: "profile" })}
            onPress={onSubmit}
            primaryLoading={loading}
            primaryDisabled={
              loading || !username || username.length < 3 || !password
            }
            secondaryLabel={t("cancel", { ns: "profile" })}
            secondaryOnPress={() => navigation.goBack()}
            secondaryDisabled={loading}
          />
        </View>
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1 },
    formScroll: { flex: 1 },
    formContent: { paddingBottom: theme.spacing.sm },
    error: { marginBottom: theme.spacing.sm },
    label: {
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      marginBottom: theme.spacing.xs,
      fontSize: theme.typography.size.bodyL,
    },
    input: { marginBottom: theme.spacing.md },
    inputLarge: { marginBottom: theme.spacing.xl },
    actions: { gap: theme.spacing.md, paddingTop: theme.spacing.sm },
  });

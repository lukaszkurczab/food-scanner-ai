import { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@contexts/UserContext";
import {
  BackTitleHeader,
  Layout,
  TextInput,
  ErrorBox,
} from "@/components";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

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

type ChangeEmailNavigation = StackNavigationProp<RootStackParamList>;
type Props = {
  navigation: ChangeEmailNavigation;
};

function getErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export default function ChangeEmailScreen({ navigation }: Props) {
  const { t } = useTranslation(["profile", "login"]);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { changeEmail } = useUserContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateEmail = (v: string) => /\S+@\S+\.\S+/.test(v);

  const validate = async () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) newErrors.email = t("enter_email", { ns: "login" });
    else if (!validateEmail(email))
      newErrors.email = t("invalid_email", { ns: "login" });

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
      await changeEmail(email.trim(), password);
      navigation.navigate("ChangeEmailCheckMailbox", {
        email: email.trim(),
      });
    } catch (e: unknown) {
      const code = getErrorCode(e);
      let errKey = "login_failed";
      if (code) errKey = mapFirebaseErrorToKey(code);
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
    <Layout disableScroll keyboardAvoiding={Platform.OS !== "ios"}>
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
            title={t("changeEmail", { ns: "profile" })}
            onBack={() => navigation.goBack()}
          />
          <Text style={styles.label}>
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
            style={styles.input}
          />

          <Text style={styles.label}>
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
            style={styles.inputLarge}
          />

          <Text style={styles.note}>
            {t("emailChangeSecurityNote", {
              ns: "profile",
              defaultValue:
                "Możesz zostać poproszony o ponowne zalogowanie ze względów bezpieczeństwa.",
            })}
          </Text>
        </ScrollView>

        <View style={styles.actions}>
          <GlobalActionButtons
            label={t("confirm", { ns: "profile" })}
            onPress={onSubmit}
            primaryLoading={loading}
            primaryDisabled={
              loading ||
              !email ||
              !password ||
              (touched.email && !!errors.email) ||
              (touched.password && !!errors.password)
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
      fontSize: theme.typography.size.base,
    },
    input: { marginBottom: theme.spacing.md },
    inputLarge: { marginBottom: theme.spacing.xl },
    note: {
      color: theme.textSecondary,
      textAlign: "center",
      fontSize: theme.typography.size.sm,
      marginBottom: theme.spacing.xl,
    },
    actions: { gap: theme.spacing.md, paddingTop: theme.spacing.sm },
  });

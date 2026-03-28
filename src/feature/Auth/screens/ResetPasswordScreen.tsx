import { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Keyboard,
  Platform,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { getFirebaseAuth } from "@/FirebaseConfig";
import { Button, TextInput, LinkText, ErrorBox } from "@/components";
import { validateEmail } from "@/utils/validation";
import { authSendPasswordReset } from "@/feature/Auth/services/authService";
import { AuthScreenLayout } from "@/feature/Auth/components/AuthScreenLayout";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

type ResetPasswordNavigation = StackNavigationProp<RootStackParamList>;
type Props = {
  navigation: ResetPasswordNavigation;
};

function getErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export default function ResetPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation(["resetPassword", "common"]);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [noInternet, setNoInternet] = useState(false);

  const inputRef = useRef<RNTextInput | null>(null);

  useEffect(() => {
    if (inputRef.current && Platform.OS !== "web") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      const net = await NetInfo.fetch();
      setNoInternet(!net.isConnected);
    };

    check();

    const unsub = NetInfo.addEventListener((state) => {
      setNoInternet(!state.isConnected);
    });

    return () => unsub();
  }, []);

  const handleBlur = () => {
    setEmail((e) => e.trim().toLowerCase());
    setTouched(true);
  };

  useEffect(() => {
    if (!touched) return;

    if (!email) {
      setError(t("errorRequired"));
    } else if (!validateEmail(email)) {
      setError(t("errorInvalid"));
    } else {
      setError(null);
    }
  }, [email, touched, t]);

  const onSubmit = async () => {
    Keyboard.dismiss();
    setTouched(true);

    if (!email) {
      setError(t("errorRequired"));
      return;
    }

    if (!validateEmail(email)) {
      setError(t("errorInvalid"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await getFirebaseAuth();
      await authSendPasswordReset(email.trim().toLowerCase());

      navigation.navigate("CheckMailbox", {
        email: email.trim().toLowerCase(),
      });
    } catch (err: unknown) {
      const code = getErrorCode(err);
      setLoading(false);

      if (code === "auth/network-request-failed" || noInternet) {
        setError(t("errorNoInternet"));
      } else if (code === "auth/user-not-found") {
        setError(t("errorNotFound") ?? "User not found");
      } else {
        setError(t("errorGeneric") ?? "Unexpected error");
      }
    }
  };

  useEffect(() => {
    if (error) setError(null);
  }, [email, error]);

  return (
    <View style={styles.screen}>
      <AuthScreenLayout
        title={t("title")}
        subtitle={t("description")}
        banner={noInternet ? <ErrorBox message={t("errorNoInternet")} /> : null}
        footer={
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{t("rememberPassword")} </Text>
            <LinkText
              onPress={() => navigation.navigate("Login")}
              accessibilityRole="link"
            >
              {t("login")}
            </LinkText>
          </View>
        }
      >
        <View style={styles.formSection}>
          <TextInput
            ref={inputRef}
            label={t("email")}
            placeholder={t("emailPlaceholder")}
            value={email}
            onChangeText={setEmail}
            onBlur={handleBlur}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            error={touched && error ? error : undefined}
            disabled={loading || noInternet}
            accessibilityLabel={t("email")}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            style={styles.fieldSpacing}
          />
        </View>
        <Button
          label={t("resetBtn")}
          onPress={onSubmit}
          loading={loading}
          disabled={
            loading || noInternet || !email || !!error || !validateEmail(email)
          }
          accessibilityLabel={t("resetBtn")}
          style={styles.actionSpacing}
        />
      </AuthScreenLayout>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    topLeftAction: {
      top: 0,
      left: 0,
    },
    formSection: {
      width: "100%",
      flexGrow: 1,
    },
    fieldSpacing: {
      marginBottom: theme.spacing.sectionGap,
    },
    actionSpacing: {
      marginTop: theme.spacing.xs,
    },
    footerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
    },
    footerText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });

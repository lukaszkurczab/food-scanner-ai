import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Keyboard,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import { useTheme } from "@/theme/useTheme";
import {
  TextInput,
  ErrorBox,
  Layout,
} from "@/components";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";
import { Feather } from "@expo/vector-icons";
import { useUserContext } from "@contexts/UserContext";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

type ChangePasswordNavigation = StackNavigationProp<RootStackParamList>;
type Props = {
  navigation: ChangePasswordNavigation;
};

function getErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export default function ChangePasswordScreen({ navigation }: Props) {
  const { t } = useTranslation(["profile", "common"]);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { changePassword } = useUserContext();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [noInternet, setNoInternet] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNoInternet(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const validate = () => {
    if (!oldPassword) return t("profile:enter_current_password");
    if (!newPassword) return t("profile:enter_new_password");
    if (newPassword.length < 8)
      return t("profile:password_min_length", { count: 8 });
    if (newPassword !== confirmPassword)
      return t("profile:passwords_do_not_match");
    if (oldPassword === newPassword)
      return t("profile:new_password_must_be_different");
    return null;
  };

  const handleSubmit = async () => {
    setTouched({ old: true, new: true, confirm: true });
    setError(null);
    Keyboard.dismiss();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      navigation.goBack();
    } catch (err: unknown) {
      const code = getErrorCode(err);
      let msg = t("common:default_error");
      if (code === "auth/wrong-password") {
        msg = t("profile:invalid_current_password");
      } else if (code === "auth/weak-password") {
        msg = t("profile:weak_password");
      }
      setError(msg);
    }
    setLoading(false);
  };

  const renderEyeIcon = (show: boolean, toggle: () => void) => (
    <TouchableOpacity onPress={toggle}>
      <Feather name={show ? "eye-off" : "eye"} size={22} color={theme.text} />
    </TouchableOpacity>
  );

  return (
    <Layout
      showNavigation={false}
      disableScroll
      keyboardAvoiding={Platform.OS !== "ios"}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            {t("profile:change_password")}
          </Text>

          {noInternet && <ErrorBox message={t("common:no_internet")} />}
          {error && <ErrorBox message={error} />}

          <TextInput
            label={t("profile:old_password")}
            value={oldPassword}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            placeholder={t("profile:enter_current_password")}
            secureTextEntry={!showOld}
            onChangeText={setOldPassword}
            onBlur={() => setTouched((t) => ({ ...t, old: true }))}
            error={
              touched.old && !oldPassword
                ? t("profile:enter_current_password")
                : undefined
            }
            icon={renderEyeIcon(showOld, () => setShowOld((v) => !v))}
            iconPosition="right"
            style={styles.input}
          />

          <TextInput
            label={t("profile:new_password")}
            value={newPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder={t("profile:enter_new_password")}
            secureTextEntry={!showNew}
            onChangeText={setNewPassword}
            onBlur={() => setTouched((t) => ({ ...t, new: true }))}
            error={
              touched.new && !newPassword
                ? t("profile:enter_new_password")
                : undefined
            }
            icon={renderEyeIcon(showNew, () => setShowNew((v) => !v))}
            iconPosition="right"
            style={styles.input}
          />

          <TextInput
            label={t("profile:confirm_new_password")}
            value={confirmPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder={t("profile:repeat_new_password")}
            secureTextEntry={!showConfirm}
            onChangeText={setConfirmPassword}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            error={
              touched.confirm && confirmPassword !== newPassword
                ? t("profile:passwords_do_not_match")
                : undefined
            }
            icon={renderEyeIcon(showConfirm, () => setShowConfirm((v) => !v))}
            iconPosition="right"
            style={styles.inputLarge}
          />
        </ScrollView>

        <GlobalActionButtons
          label={t("common:confirm")}
          onPress={handleSubmit}
          primaryDisabled={
            loading ||
            !oldPassword ||
            !newPassword ||
            !confirmPassword ||
            noInternet
          }
          primaryLoading={loading}
          secondaryLabel={t("common:cancel")}
          secondaryOnPress={() => navigation.goBack()}
          containerStyle={styles.actions}
        />
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1 },
    formScroll: { flex: 1 },
    formContent: { paddingBottom: theme.spacing.sm },
    title: {
      fontSize: theme.typography.size.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      marginBottom: theme.spacing.xl,
      textAlign: "center",
    },
    input: { marginBottom: theme.spacing.lg },
    inputLarge: { marginBottom: theme.spacing.xl },
    actions: { marginTop: theme.spacing.sm },
  });

import React, { useState } from "react";
import { View, Text, Keyboard, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import { useTheme } from "@/theme/useTheme";
import {
  TextInput,
  PrimaryButton,
  SecondaryButton,
  ErrorBox,
  Layout,
} from "@/components";
import { Feather } from "@expo/vector-icons";
import { useUserContext } from "@contexts/UserContext";

export default function ChangePasswordScreen({ navigation }: any) {
  const { t } = useTranslation(["profile", "common"]);
  const theme = useTheme();
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

  React.useEffect(() => {
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
    } catch (err: any) {
      let msg = t("common:default_error");
      if (err?.code === "auth/wrong-password") {
        msg = t("profile:invalid_current_password");
      } else if (err?.code === "auth/weak-password") {
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
    <Layout showNavigation={false}>
      <View
        style={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: theme.typography.size.xl,
            fontFamily: theme.typography.fontFamily.bold,
            color: theme.text,
            marginBottom: theme.spacing.xl,
            textAlign: "center",
          }}
        >
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
          style={{ marginBottom: theme.spacing.lg }}
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
          style={{ marginBottom: theme.spacing.lg }}
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
          style={{ marginBottom: theme.spacing.xl }}
        />

        <PrimaryButton
          label={t("common:confirm")}
          onPress={handleSubmit}
          disabled={
            loading ||
            !oldPassword ||
            !newPassword ||
            !confirmPassword ||
            noInternet
          }
          loading={loading}
        />
        <SecondaryButton
          label={t("common:cancel")}
          onPress={() => navigation.goBack()}
          style={{ marginTop: theme.spacing.md }}
        />
      </View>
    </Layout>
  );
}

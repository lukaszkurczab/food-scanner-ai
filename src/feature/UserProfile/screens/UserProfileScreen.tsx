import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@contexts/UserContext";
import { ButtonToggle, InputModal, Layout, UserIcon } from "@/components";
import { getAuth, signOut } from "@react-native-firebase/auth";
import SectionHeader from "../components/SectionHeader";
import ListItem from "../components/ListItem";
import { getStreak } from "@/services/streakService";
import { useAuthContext } from "@/context/AuthContext";
import { useBadges } from "@/hooks/useBadges";
import { usePremiumContext } from "@/context/PremiumContext";
import AvatarBadge from "@/components/AvatarBadge";
import { Modal } from "@/components/Modal";

export default function UserProfileScreen({ navigation }: any) {
  const { t } = useTranslation("profile");
  const theme = useTheme();
  const { userData, updateUser, deleteUser, exportUserData } = useUserContext();
  const { uid } = useAuthContext();
  const { isPremium } = usePremiumContext();
  const { badges, ensurePremiumBadges } = useBadges(uid);
  const [streak, setStreak] = useState<number>(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportModalMessage, setExportModalMessage] = useState("");
  const [exportModalTitle, setExportModalTitle] = useState("");

  useEffect(() => {
    if (!uid) return;
    getStreak(uid)
      .then((s) => setStreak(Number(s?.current) || 0))
      .catch(() => setStreak(0));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    if (isPremium === null || isPremium === undefined) return;
    ensurePremiumBadges(isPremium).catch(() => {});
  }, [uid, isPremium, ensurePremiumBadges]);

  useEffect(() => {
    if (!userData) {
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  }, [userData, navigation]);

  if (!userData) return null;

  const darkTheme = !!userData.darkTheme;
  const avatarSrc = userData.avatarLocalPath || userData.avatarUrl || "";
  const safeBadges = Array.isArray(badges) ? badges : [];
  const hasPremiumBadge = safeBadges.some((b) => b.type === "premium");
  const overrideColor = isPremium && !hasPremiumBadge ? "#C9A227" : undefined;
  const overrideEmoji = isPremium && !hasPremiumBadge ? "⭐" : undefined;

  const handleThemeToggle = async (newValue: boolean) => {
    theme.setMode(newValue ? "dark" : "light");
    await updateUser({ ...userData, darkTheme: newValue });
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch {}
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      await deleteUser(password);
    } catch {
      setExportModalTitle(t("deleteAccountError"));
      setExportModalMessage(t("wrongPasswordOrUnknownError"));
      setExportModalVisible(true);
    }
    setPassword("");
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      await exportUserData();
      setExportModalTitle(t("downloadYourData"));
      setExportModalMessage(
        t("exportSuccess", {
          defaultValue:
            "Your data has been prepared and should appear in your sharing options.",
        })
      );
      setExportModalVisible(true);
    } catch {
      setExportModalTitle(t("downloadYourData"));
      setExportModalMessage(
        t("exportError", { defaultValue: "Could not export your data." })
      );
      setExportModalVisible(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <View style={styles.header}>
        <AvatarBadge
          size={96}
          uri={avatarSrc || undefined}
          badges={safeBadges}
          overrideColor={overrideColor}
          overrideEmoji={overrideEmoji}
          fallbackIcon={<UserIcon size={84} />}
          accessibilityLabel={t("profilePicture")}
        />
        <Text
          style={[styles.username, { color: theme.text }]}
          accessibilityRole="header"
        >
          {userData.username}
        </Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>
          {userData.email}
        </Text>
        <Text style={{ color: theme.textSecondary, marginTop: 4 }}>
          🔥 {streak}
        </Text>
      </View>

      <SectionHeader label={t("userSection")} />
      <ListItem
        label={t("changeUserData")}
        onPress={() => navigation.navigate("EditUserData")}
        accessibilityLabel={t("changeUserData")}
      />
      <ListItem
        label={t("updateHealthSurvey")}
        onPress={() => navigation.navigate("Onboarding", { mode: "refill" })}
        accessibilityLabel={t("updateHealthSurvey")}
      />
      <ListItem
        label={t("manageNotifications")}
        onPress={() => navigation.navigate("Notifications")}
        accessibilityLabel={t("manageNotifications")}
      />
      <ListItem
        label={t("manageSubscription.title")}
        onPress={() => navigation.navigate("ManageSubscription")}
        accessibilityLabel={t("manageSubscription.title")}
      />
      <ListItem
        label={t("downloadYourData")}
        onPress={handleExportData}
        accessibilityLabel={t("downloadYourData")}
        style={{ marginBottom: 24 }}
        disabled={exporting}
        loading={exporting}
      />

      <SectionHeader label={t("settingsSection")} />
      <View
        style={[
          styles.rowCenter,
          {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border,
            paddingVertical: 16,
          },
        ]}
      >
        <Text
          style={{
            flex: 1,
            color: theme.text,
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.md,
          }}
          numberOfLines={1}
        >
          {t("toggleDarkMode")}
        </Text>
        <ButtonToggle
          value={darkTheme}
          onToggle={handleThemeToggle}
          accessibilityLabel={t("toggleDarkMode")}
          trackColor={darkTheme ? theme.accentSecondary : theme.textSecondary}
          thumbColor={theme.card}
          borderColor={theme.border}
        />
      </View>
      <ListItem
        label={t("language")}
        onPress={() => navigation.navigate("Language")}
        accessibilityLabel={t("language")}
      />
      <ListItem
        label={t("termsOfService")}
        onPress={() => navigation.navigate("Terms")}
        accessibilityLabel={t("termsOfService")}
      />
      <ListItem
        label={t("privacyPolicy")}
        onPress={() => navigation.navigate("Privacy")}
        accessibilityLabel={t("privacyPolicy")}
      />
      <ListItem
        label={t("sendFeedback")}
        onPress={() => navigation.navigate("SendFeedback")}
        accessibilityLabel={t("sendFeedback")}
      />
      <ListItem
        label={t("logOut")}
        onPress={handleLogout}
        accessibilityLabel={t("logOut")}
      />

      <Pressable
        style={styles.deleteAccount}
        onPress={() => setShowDeleteModal(true)}
        accessibilityRole="button"
        accessibilityLabel={t("deleteAccount")}
      >
        <Text style={[styles.deleteText, { color: theme.error.text }]}>
          {t("deleteAccount")}
        </Text>
      </Pressable>

      <Text style={[styles.version, { color: theme.textSecondary }]}>
        {t("appVersion")} 1.0.0
      </Text>

      <InputModal
        visible={showDeleteModal}
        title={t("deleteAccount")}
        message={t("deleteAccountWarning")}
        primaryActionLabel={t("confirm")}
        onPrimaryAction={handleDeleteAccount}
        secondaryActionLabel={t("cancel")}
        onSecondaryAction={() => setShowDeleteModal(false)}
        onClose={() => setShowDeleteModal(false)}
        placeholder={t("enterPassword")}
        value={password}
        onChange={setPassword}
        secureTextEntry={true}
      />

      <Modal
        visible={exportModalVisible}
        title={exportModalTitle}
        message={exportModalMessage}
        primaryActionLabel={t("confirm")}
        onPrimaryAction={() => setExportModalVisible(false)}
        onClose={() => setExportModalVisible(false)}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Inter-Bold",
    marginBottom: 2,
  },
  email: {
    fontSize: 16,
  },
  deleteAccount: {
    alignItems: "center",
    marginVertical: 24,
  },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  deleteText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  version: {
    textAlign: "center",
    fontSize: 14,
  },
});

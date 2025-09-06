import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@contexts/UserContext";
import { ButtonToggle, InputModal, Layout, UserIcon } from "@/components";
import { getAuth, signOut } from "@react-native-firebase/auth";
import SectionHeader from "../components/SectionHeader";
import ListItem from "../components/ListItem";
import { getStreak } from "@/services/streakService";
import { useAuthContext } from "@/context/AuthContext";

export default function UserProfileScreen({ navigation }: any) {
  const { t } = useTranslation("profile");
  const theme = useTheme();
  const { userData, updateUser, deleteUser, exportUserData } = useUserContext();
  const { uid } = useAuthContext();
  const [streak, setStreak] = useState<number>(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getStreak(uid).then((s) => setStreak(s.current || 0));
  }, [uid]);

  if (!userData) {
    navigation.navigate("Login");
    return null;
  }

  const darkTheme = !!userData.darkTheme;

  const handleThemeToggle = async (newValue: boolean) => {
    theme.setMode(newValue ? "dark" : "light");
    await updateUser({ ...userData, darkTheme: newValue });
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch (e) {}
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      await deleteUser(password);
    } catch (e) {
      Alert.alert(t("deleteAccountError"), t("wrongPasswordOrUnknownError"));
    }
    setPassword("");
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      await exportUserData();
      Alert.alert(
        t("downloadYourData"),
        t("exportSuccess", {
          defaultValue:
            "Your data has been prepared and should appear in your sharing options.",
        })
      );
    } catch (e: any) {
      Alert.alert(
        t("downloadYourData"),
        t("exportError", { defaultValue: "Could not export your data." })
      );
    }
    setExporting(false);
  };

  const avatarSrc = userData.avatarLocalPath || userData.avatarUrl || "";

  return (
    <Layout>
      <View style={styles.header}>
        {avatarSrc ? (
          <Image
            source={{ uri: avatarSrc }}
            style={styles.avatar}
            accessible
            accessibilityLabel={t("profilePicture")}
          />
        ) : (
          <UserIcon size={96} accessibilityLabel={t("profilePictureDefault")} />
        )}
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
        onPress={() => navigation.navigate("Onboarding")}
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
        accessibilityLabel={t("manageSubscription")}
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
        CaloriAI 1.0.0
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
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
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

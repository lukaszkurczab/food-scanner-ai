import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import { useUserContext } from "@/src/context/UserContext";
import { ButtonToggle, InputModal, Layout } from "@/src/components";
import { navigationRef } from "@/src/navigation/navigate";
import { UserIcon } from "@/src/components/UserIcon";
import { getAuth, signOut } from "@react-native-firebase/auth";
import SectionHeader from "../components/SectionHeader";
import ListItem from "../components/ListItem";

export default function UserProfileScreen({ navigation }: any) {
  const { t } = useTranslation("profile");
  const theme = useTheme();
  const { userData, updateUser, deleteUser } = useUserContext();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState("");

  if (!userData) {
    navigation.navigate("Login");
    return null;
  }

  const darkTheme = !!userData.darkTheme;

  const handleThemeToggle = async (newValue: boolean) => {
    theme.toggleTheme(newValue ? "dark" : "light");
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

  return (
    <Layout>
      <View style={styles.header}>
        {userData.avatarLocalPath ? (
          <Image
            source={{ uri: userData.avatarLocalPath }}
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
        label={t("manageSubscription")}
        onPress={() => navigation.navigate("ManageSubscription")}
        accessibilityLabel={t("manageSubscription")}
      />
      <ListItem
        label={t("downloadYourData")}
        onPress={() => navigation.navigate("DownloadYourData")}
        accessibilityLabel={t("downloadYourData")}
        style={{ marginBottom: 24 }}
      />

      <SectionHeader label={t("settingsSection")} />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text
          style={{
            flex: 1,
            color: theme.text,
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.base,
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
  deleteText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  version: {
    textAlign: "center",
    fontSize: 14,
  },
});

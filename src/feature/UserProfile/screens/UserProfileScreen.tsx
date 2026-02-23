import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { ButtonToggle, InputModal, Layout, UserIcon } from "@/components";
import SectionHeader from "../components/SectionHeader";
import ListItem from "../components/ListItem";
import AvatarBadge from "@/components/AvatarBadge";
import { Modal } from "@/components/Modal";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import { useUserProfileState } from "@/feature/UserProfile/hooks/useUserProfileState";

type ProfileNavigation = StackNavigationProp<RootStackParamList, "Profile">;

type UserProfileScreenProps = {
  navigation: ProfileNavigation;
};

export default function UserProfileScreen({ navigation }: UserProfileScreenProps) {
  const { t } = useTranslation("profile");
  const theme = useTheme();

  const state = useUserProfileState({ navigation });

  if (!state.userData) return null;

  return (
    <Layout>
      <View style={styles.header}>
        <AvatarBadge
          size={96}
          uri={state.avatarSrc || undefined}
          badges={state.safeBadges}
          overrideColor={state.overrideColor}
          overrideEmoji={state.overrideEmoji}
          fallbackIcon={<UserIcon size={84} />}
          accessibilityLabel={t("profilePicture")}
        />
        <Text
          style={[styles.username, { color: theme.text }]}
          accessibilityRole="header"
          numberOfLines={1}
        >
          {state.userData.username}
        </Text>
        <Text
          style={[styles.email, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {state.userData.email}
        </Text>
        <Text style={{ color: theme.textSecondary, marginTop: 4 }}>
          🔥 {state.streak}
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
        onPress={state.handleExportData}
        accessibilityLabel={t("downloadYourData")}
        style={{ marginBottom: 24 }}
        disabled={state.exporting}
        loading={state.exporting}
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
          value={state.darkTheme}
          onToggle={state.handleThemeToggle}
          accessibilityLabel={t("toggleDarkMode")}
          trackColor={
            state.darkTheme ? theme.accentSecondary : theme.textSecondary
          }
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
        onPress={state.handleLogout}
        accessibilityLabel={t("logOut")}
      />

      <Pressable
        style={styles.deleteAccount}
        onPress={state.openDeleteModal}
        accessibilityRole="button"
        accessibilityLabel={t("deleteAccount")}
      >
        <Text style={[styles.deleteText, { color: theme.error.text }]}>
          {t("deleteAccount")}
        </Text>
      </Pressable>

      <Text style={[styles.version, { color: theme.textSecondary }]}>
        {t("appVersion")} 1.0.1
      </Text>

      <InputModal
        visible={state.showDeleteModal}
        title={t("deleteAccount")}
        message={t("deleteAccountWarning")}
        primaryActionLabel={t("confirm")}
        onPrimaryAction={state.handleDeleteAccount}
        secondaryActionLabel={t("cancel")}
        onSecondaryAction={state.closeDeleteModal}
        onClose={state.closeDeleteModal}
        placeholder={t("enterPassword")}
        value={state.password}
        onChange={state.setPassword}
        secureTextEntry={true}
      />

      <Modal
        visible={state.exportModalVisible}
        title={state.exportModalTitle}
        message={state.exportModalMessage}
        primaryActionLabel={t("confirm")}
        onPrimaryAction={state.closeExportModal}
        onClose={state.closeExportModal}
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

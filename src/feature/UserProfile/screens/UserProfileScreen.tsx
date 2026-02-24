import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { ButtonToggle, InputModal, Layout } from "@/components";
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
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);

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
          fallbackIcon={
            <MaterialIcons
              name="person"
              size={52}
              color={theme.textSecondary}
            />
          }
          accessibilityLabel={t("profilePicture")}
        />
        <Text style={styles.username} accessibilityRole="header" numberOfLines={1}>
          {state.userData.username}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {state.userData.email}
        </Text>
        <Text style={styles.streak}>🔥 {state.streak}</Text>
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
        style={styles.listItemSpacing}
        disabled={state.exporting}
        loading={state.exporting}
      />

      <SectionHeader label={t("settingsSection")} />
      <View
        style={styles.toggleRow}
      >
        <Text style={styles.toggleLabel} numberOfLines={1}>
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
        <Text style={styles.deleteText}>
          {t("deleteAccount")}
        </Text>
      </Pressable>

      <Text style={styles.version}>
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

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    username: {
      fontSize: theme.typography.size.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      marginBottom: theme.spacing.xs,
    },
    email: {
      fontSize: theme.typography.size.base,
      color: theme.textSecondary,
    },
    streak: {
      color: theme.textSecondary,
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.sm,
    },
    listItemSpacing: { marginBottom: theme.spacing.xl },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      paddingVertical: theme.spacing.md,
    },
    toggleLabel: {
      flex: 1,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.md,
    },
    deleteAccount: {
      alignItems: "center",
      marginVertical: theme.spacing.xl,
    },
    deleteText: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.error.text,
    },
    version: {
      textAlign: "center",
      fontSize: theme.typography.size.sm,
      color: theme.textSecondary,
    },
  });

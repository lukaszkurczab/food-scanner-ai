import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@/context/UserContext";
import { useAuthContext } from "@/context/AuthContext";
import { useBadges } from "@/hooks/useBadges";
import { usePremiumContext } from "@/context/PremiumContext";
import { authLogout } from "@/feature/Auth/services/authService";
import { subscribeStreak } from "@/services/gamification/streakService";
import type { RootStackParamList } from "@/navigation/navigate";

type ProfileNavigation = StackNavigationProp<RootStackParamList, "Profile">;

export function useUserProfileState(params: {
  navigation: ProfileNavigation;
}) {
  const { t } = useTranslation("profile");
  const theme = useTheme();
  const netInfo = useNetInfo();
  const {
    userData,
    loadingUser,
    refreshUser,
    deleteUser,
    exportUserData,
    syncState,
    retryProfileSync,
    retryingProfileSync,
  } = useUserContext();
  const { uid } = useAuthContext();
  const isOnline = netInfo.isConnected !== false;
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
    const unsubscribe = subscribeStreak(uid, (state) =>
      setStreak(Number(state?.current) || 0)
    );
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    if (isPremium === null || isPremium === undefined) return;

    ensurePremiumBadges(isPremium).catch(() => {});
  }, [ensurePremiumBadges, isPremium, uid]);

  useEffect(() => {
    if (!uid) {
      params.navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  }, [params.navigation, uid]);

  const safeBadges = useMemo(
    () => (Array.isArray(badges) ? badges : []),
    [badges],
  );

  const hasPremiumBadge = safeBadges.some((badge) => badge.type === "premium");
  const overrideColor = isPremium && !hasPremiumBadge ? "#C9A227" : undefined;
  const overrideEmoji = isPremium && !hasPremiumBadge ? "⭐" : undefined;

  const avatarSrc = userData?.avatarLocalPath || userData?.avatarUrl || "";
  const darkTheme = theme.mode === "dark";

  const handleThemeToggle = useCallback(
    (newValue: boolean) => {
      theme.setMode(newValue ? "dark" : "light");
    },
    [theme],
  );

  const handleLogout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      // Ignore sign-out errors to avoid blocking local logout flow.
    }
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const openDeleteModal = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    setShowDeleteModal(false);

    try {
      await deleteUser(password);
    } catch {
      setExportModalTitle(t("deleteAccountError"));
      setExportModalMessage(t("wrongPasswordOrUnknownError"));
      setExportModalVisible(true);
    }

    setPassword("");
  }, [deleteUser, password, t]);

  const handleExportData = useCallback(async () => {
    setExporting(true);

    try {
      const fileUri = await exportUserData();
      const outputPath = typeof fileUri === "string" ? fileUri : "";
      const fileName = outputPath.split("/").pop() ?? "fitaly_user_data.pdf";

      setExportModalTitle(t("downloadYourData"));
      setExportModalMessage(
        `${t("exportSavedSuccess", { filename: fileName })}\n${t(
          "exportSavedPathHint",
          { path: outputPath || "-" },
        )}`,
      );
      setExportModalVisible(true);
    } catch {
      setExportModalTitle(t("downloadYourData"));
      setExportModalMessage(t("exportError"));
      setExportModalVisible(true);
    } finally {
      setExporting(false);
    }
  }, [exportUserData, t]);

  const closeExportModal = useCallback(() => {
    setExportModalVisible(false);
  }, []);

  const handleRetryProfileLoad = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  return {
    userData,
    loadingUser,
    isOnline,
    streak,
    syncState,
    retryProfileSync,
    retryingProfileSync,
    avatarSrc,
    safeBadges,
    overrideColor,
    overrideEmoji,
    darkTheme,
    showDeleteModal,
    password,
    setPassword,
    exporting,
    exportModalVisible,
    exportModalMessage,
    exportModalTitle,
    handleThemeToggle,
    handleLogout,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteAccount,
    handleExportData,
    closeExportModal,
    handleRetryProfileLoad,
  };
}

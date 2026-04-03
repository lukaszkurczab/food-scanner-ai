import { useCallback, useEffect, useMemo } from "react";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNetInfo } from "@react-native-community/netinfo";
import { useUserContext } from "@/context/UserContext";
import { useAuthContext } from "@/context/AuthContext";
import { useBadges } from "@/hooks/useBadges";
import { usePremiumContext } from "@/context/PremiumContext";
import { authLogout } from "@/feature/Auth/services/authService";
import type { RootStackParamList } from "@/navigation/navigate";

type ProfileNavigation = StackNavigationProp<RootStackParamList, "Profile">;

export function useUserProfileState(params: {
  navigation: ProfileNavigation;
}) {
  const netInfo = useNetInfo();
  const {
    userData,
    loadingUser,
    refreshUser,
    syncState,
    retryProfileSync,
    retryingProfileSync,
  } = useUserContext();
  const { uid } = useAuthContext();
  const isOnline = netInfo.isConnected !== false;
  const { isPremium } = usePremiumContext();
  const { badges, ensurePremiumBadges } = useBadges(uid);

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

  const handleLogout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      // Ignore sign-out errors to avoid blocking local logout flow.
    }
  }, []);

  const handleRetryProfileLoad = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  return {
    userData,
    loadingUser,
    isOnline,
    syncState,
    retryProfileSync,
    retryingProfileSync,
    avatarSrc,
    safeBadges,
    overrideColor,
    overrideEmoji,
    handleLogout,
    handleRetryProfileLoad,
  };
}

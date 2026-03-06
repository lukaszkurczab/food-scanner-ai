import { useEffect, useRef } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Layout } from "@/components";
import { useUserContext } from "@contexts/UserContext";
import { useAuthContext } from "@/context/AuthContext";
import { resetIfMissed, ensureStreakDoc } from "@/services/streakService";
import { primeBadges } from "@/services/badgeService";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import {
  buildE2EProfileSeed,
  isE2EModeEnabled,
} from "@/services/e2e/config";

type LoadingScreenNavigation = StackNavigationProp<RootStackParamList, "Loading">;
type Props = {
  navigation: LoadingScreenNavigation;
};

const LoadingScreen = ({ navigation }: Props) => {
  const { firebaseUser, uid } = useAuthContext();
  const { userData, loadingUser, refreshUser, updateUser } = useUserContext();
  const routedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (routedRef.current) return;
      if (!firebaseUser || !uid) {
        routedRef.current = true;
        navigation.replace("Login");
        return;
      }
      if (loadingUser) return;

      await ensureStreakDoc(uid);
      await resetIfMissed(uid);
      await primeBadges(uid);
      if (cancelled) return;

      let profile = userData ?? (await refreshUser());
      if (cancelled) return;

      if (isE2EModeEnabled()) {
        if (!profile && uid) {
          try {
            await updateUser(
              buildE2EProfileSeed(uid, firebaseUser.email ?? "")
            );
            profile = await refreshUser();
          } catch {
            // In E2E mode, profile seeding is best-effort.
          }
        }
        if (cancelled) return;
        routedRef.current = true;
        navigation.replace("Home");
        return;
      }

      routedRef.current = true;
      if (profile?.surveyComplited) {
        navigation.replace("Home");
      } else {
        navigation.replace("Onboarding");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    firebaseUser,
    loadingUser,
    refreshUser,
    updateUser,
    uid,
    userData,
    navigation,
  ]);

  return (
    <Layout showNavigation={false}>
      <View style={styles.centerBoth}>
        <ActivityIndicator size="large" />
      </View>
    </Layout>
  );
};

export default LoadingScreen;

const styles = StyleSheet.create({
  centerBoth: { flex: 1, justifyContent: "center", alignItems: "center" },
});

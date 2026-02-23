import { useEffect, useRef } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Layout } from "@/components";
import { useUserContext } from "@contexts/UserContext";
import { useAuthContext } from "@/context/AuthContext";
import { resetIfMissed, ensureStreakDoc } from "@/services/streakService";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

type LoadingScreenNavigation = StackNavigationProp<RootStackParamList, "Loading">;
type Props = {
  navigation: LoadingScreenNavigation;
};

const LoadingScreen = ({ navigation }: Props) => {
  const { firebaseUser, uid } = useAuthContext();
  const { userData, loadingUser, refreshUser } = useUserContext();
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
      if (cancelled) return;

      const profile = userData ?? (await refreshUser());
      if (cancelled) return;
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

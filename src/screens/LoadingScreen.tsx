import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Layout } from "@/components";
import { useUserContext } from "@contexts/UserContext";
import { useAuthContext } from "@/context/AuthContext";
import { useUser } from "@hooks/useUser";
import { resetIfMissed, ensureStreakDoc } from "@/services/streakService";

const LoadingScreen = ({ navigation }: any) => {
  const { firebaseUser, uid } = useAuthContext();
  const { userData, getUserData } = useUserContext();
  const { fetchUserFromCloud } = useUser(uid!);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!firebaseUser) {
        navigation.replace("Login");
        return;
      }

      await ensureStreakDoc(uid!);
      await resetIfMissed(uid!);

      const local = await getUserData();
      if (cancelled) return;

      if (local) {
        if (local.surveyComplited) navigation.replace("Home");
        else navigation.replace("Onboarding");
        return;
      }

      if (fetchUserFromCloud) {
        const cloud = await fetchUserFromCloud();
        if (cancelled) return;

        if (cloud) {
          if (cloud.surveyComplited) navigation.replace("Home");
          else navigation.replace("Onboarding");
          return;
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    firebaseUser,
    userData,
    getUserData,
    fetchUserFromCloud,
    navigation,
    uid,
  ]);

  return (
    <Layout showNavigation={false}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    </Layout>
  );
};

export default LoadingScreen;

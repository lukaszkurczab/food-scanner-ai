import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Layout } from "@/components";
import { RootStackParamList } from "@/navigation/navigate";
import { useUserContext } from "@contexts/UserContext";
import { useAuthContext } from "@/context/AuthContext";

type LoadingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Home"
>;

const LoadingScreen = () => {
  const { userData, getUserData } = useUserContext();
  const { setFirebaseUser } = useAuthContext();
  const navigation = useNavigation<LoadingScreenNavigationProp>();

  useEffect(() => {
    if (!userData) {
      getUserData().then((res) => {
        if (res === undefined) {
          setFirebaseUser(null);
        }
      });
    } else if (userData.surveyComplited) {
      navigation.replace("Home");
    } else {
      navigation.replace("Onboarding");
    }
  }, [userData]);

  return (
    <Layout showNavigation={false}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    </Layout>
  );
};

export default LoadingScreen;

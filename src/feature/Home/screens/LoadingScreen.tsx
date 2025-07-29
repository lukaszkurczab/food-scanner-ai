import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Layout } from "@/src/components";
import { RootStackParamList } from "../../../navigation/navigate";
import { useUserContext } from "@/src/context/UserContext";

type LoadingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Home"
>;

const LoadingScreen = () => {
  const { userData, getUserData } = useUserContext();
  const navigation = useNavigation<LoadingScreenNavigationProp>();

  useEffect(() => {
    if (!userData) {
      getUserData();
    } else if (userData.surveyComplited) {
      navigation.replace("Home");
    } else {
      navigation.replace("Onboarding");
    }
  }, [userData]);

  return (
    <Layout>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    </Layout>
  );
};

export default LoadingScreen;

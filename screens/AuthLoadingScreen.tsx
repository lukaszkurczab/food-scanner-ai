import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/routes";

type AuthLoadingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "AuthLoadingScreen"
>;

const AuthLoadingScreen = () => {
  const auth = getAuth();
  const navigation = useNavigation<AuthLoadingScreenNavigationProp>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        navigation.reset({ index: 0, routes: [{ name: "Home" }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
};

export default AuthLoadingScreen;

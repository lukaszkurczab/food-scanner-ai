import { useState } from "react";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "@/navigation/navigate";
import { auth, firestore } from "@/firebase";

type LoginErrors = {
  password?: string;
};

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setErrors({});

    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      const userDoc = await firestore().collection("users").doc(user.uid).get();
      const userData = userDoc.data();

      if (userData?.firstLogin === true) {
        navigation.navigate("NutritionSurvey");
      } else {
        navigation.navigate("Home");
      }
    } catch (error: any) {
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setErrors({ password: "Invalid email or password." });
      } else {
        setErrors({ password: "Failed to log in. Please try again." });
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    loading,
    errors,
  };
};

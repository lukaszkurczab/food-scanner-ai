import { useState } from "react";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "@/navigation/navigate";
import { auth } from "@/firebase";

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
      await auth().signInWithEmailAndPassword(email, password);
      navigation.navigate("Home");
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

import { useState } from "react";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "@/navigation/navigate";
import { auth } from "@/firebase";

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      navigation.navigate("Home");
    } catch (error) {
      alert("Błąd logowania e-mailem i hasłem.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    loading,
  };
};

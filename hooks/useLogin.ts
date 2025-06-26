import { useState } from "react";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { setDoc } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { RootStackParamList } from "@/navigation/navigate";

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.navigate("Home");
    } catch (error) {
      alert("Błąd logowania e-mailem i hasłem.");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("email");

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email = user.providerData[0].email;

      if (!email) {
        throw new Error("Brak adresu e-mail użytkownika.");
      }

      const userRef = doc(db, "users", email);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        console.log("już jest");
      } else {
        await setDoc(userRef, {
          email: email,
          isLinked: true,
          createdAt: new Date(),
        });
        console.log("Utworzono nowego użytkownika.");
      }

      navigation.navigate("Home");
    } catch (error: any) {
      console.error("Błąd logowania Google:", error);
    } finally {
      setGoogleLoading(false);
    }
  };

  return {
    login,
    loginWithGoogle,
    loading,
    googleLoading,
  };
};

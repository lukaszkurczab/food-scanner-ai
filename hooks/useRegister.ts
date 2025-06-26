import { useState } from "react";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { arrayUnion, doc, setDoc, updateDoc } from "firebase/firestore";
import { RootStackParamList } from "@/navigation/navigate";

export const useRegister = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        isLinked: false,
        createdAt: new Date(),
      });

      const tripRef = doc(db, "trips", "trip1");
      await updateDoc(tripRef, {
        members: arrayUnion(user.uid),
      });

      navigation.navigate("Login");
    } catch (error) {
      console.error("Błąd rejestracji:", error);
      alert("Nie udało się utworzyć konta.");
    } finally {
      setLoading(false);
    }
  };

  return { register, loading };
};

import { useState } from "react";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "@/navigation/navigate";
import { auth, firestore } from "@/firebase";

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
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      await firestore().collection("users").doc(user.uid).set({
        email: user.email,
        firstName,
        lastName,
        isLinked: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await firestore()
        .collection("trips")
        .doc("trip1")
        .update({
          members: firestore.FieldValue.arrayUnion(user.uid),
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

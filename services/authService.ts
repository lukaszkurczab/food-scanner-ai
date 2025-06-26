import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from "firebase/auth";
import { auth } from "../firebaseConfig";

export const registerUser = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log("Zarejestrowano użytkownika:", userCredential.user);
    return userCredential;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Błąd rejestracji:", error.message);
      throw error;
    } else {
      console.error("Nieznany błąd:", error);
      throw new Error("Nieznany błąd rejestracji.");
    }
  }
};

export const loginUser = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

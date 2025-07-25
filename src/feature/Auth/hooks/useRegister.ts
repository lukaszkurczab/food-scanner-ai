import { useState } from "react";
import { getFirebaseAuth, getFirebaseFirestore } from "@/src/FirebaseConfig";

type RegisterErrors = {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  general?: string;
};

export const useRegister = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isStrongPassword = (password: string) => {
    return (
      password.length >= 6 &&
      password.length <= 21 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  };

  const register = async (
    email: string,
    password: string,
    confirmPassword: string,
    username: string,
    termsAccepted: boolean
  ) => {
    const newErrors: RegisterErrors = {};

    if (!isValidEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!username.trim() || username.length < 3) {
      newErrors.username = "Username must be at least 3 characters long.";
    }

    if (!isStrongPassword(password)) {
      newErrors.password =
        "Password must be 6–21 characters long and include uppercase, lowercase, number, and special character.";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!termsAccepted) {
      newErrors.terms = "You must accept the terms and conditions.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const auth = await getFirebaseAuth();
      const firestore = await getFirebaseFirestore();

      const userCredential = await auth.createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      await firestore
        .collection("users")
        .doc(user.uid)
        .set({
          email: user.email,
          username,
          firstLogin: true,
          createdAt: Date.now(),
          nutritionSurvey: {
            gender: "male",
            age: 25,
            weight: 70,
            height: 175,
            activityLevel: 1.55,
            goal: "maintenance",
            bmr: null,
            tdee: null,
            adjustedTdee: null,
          },
        });
    } catch (error: any) {
      const errorMessage: RegisterErrors = {};
      console.log(error);

      if (error.code === "auth/email-already-in-use") {
        errorMessage.email = "This email is already in use.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage.email = "Invalid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage.password = "Password is too weak.";
      } else {
        errorMessage.general = "Failed to create account. Please try again.";
      }

      setErrors(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, errors };
};

import { useState } from "react";
import { auth } from "@/FirebaseConfig";

type LoginErrors = {
  email?: string;
  password?: string;
};
type CriticalError = string | null;

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [criticalError, setCriticalError] = useState<CriticalError>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setErrors({});
    setCriticalError(null);

    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (error: any) {
      if (
        error.code === "auth/too-many-requests" ||
        error.message?.includes("too-many-requests")
      ) {
        setCriticalError("Too many requests, try later");
      } else if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setErrors({ password: "Invalid email or password." });
      } else if (error.code === "auth/network-request-failed") {
        setCriticalError("No internet connection");
      } else {
        setCriticalError("Login failed. Try again.");
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setErrors({});
    setCriticalError(null);
    setLoading(false);
  };

  return {
    login,
    loading,
    errors,
    criticalError,
    reset,
  };
};

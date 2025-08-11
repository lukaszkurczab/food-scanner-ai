import { useState } from "react";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { authLogin } from "@/feature/Auth/services/authService";

type LoginErrors = { email?: string; password?: string };
type CriticalError = string | null;

export const useLogin = (setUser: (u: FirebaseAuthTypes.User) => void) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [criticalError, setCriticalError] = useState<CriticalError>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setErrors({});
    setCriticalError(null);
    try {
      const user = await authLogin(email, password);
      setUser(user);
    } catch (error: any) {
      if (error.code === "auth/too-many-requests")
        setCriticalError("tooManyRequests");
      else if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      )
        setErrors({ password: "invalidEmailOrPassword" });
      else if (error.code === "auth/network-request-failed")
        setCriticalError("noInternet");
      else setCriticalError("loginFailed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setErrors({});
    setCriticalError(null);
    setLoading(false);
  };

  return { login, loading, errors, criticalError, reset };
};

import { useState } from "react";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { authLogin } from "@/feature/Auth/services/authService";

type LoginErrors = { email?: string; password?: string };
// Critical error keys map to i18n keys (snake_case)
type CriticalError = "too_many_requests" | "login_failed" | "no_internet" | null;

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
        setCriticalError("too_many_requests");
      else if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      )
        setErrors({ password: "invalid_email_or_password" });
      else if (error.code === "auth/network-request-failed")
        setCriticalError("no_internet");
      else setCriticalError("login_failed");
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

import { useCallback, useState } from "react";
import { authLogin } from "@/feature/Auth/services/authService";

type LoginErrors = { email?: string; password?: string };
type CriticalError =
  | "too_many_requests"
  | "login_failed"
  | "no_internet"
  | null;

const getErrorCode = (error: unknown): string | null => {
  if (typeof error !== "object" || !error) return null;
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : null;
};

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [criticalError, setCriticalError] = useState<CriticalError>(null);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setErrors({});
      setCriticalError(null);
      try {
        await authLogin(email, password);
      } catch (error: unknown) {
        const code = getErrorCode(error);
        if (code === "auth/too-many-requests")
          setCriticalError("too_many_requests");
        else if (
          code === "auth/user-not-found" ||
          code === "auth/wrong-password" ||
          code === "auth/invalid-credential"
        )
          setErrors({ password: "invalid_email_or_password" });
        else if (code === "auth/network-request-failed")
          setCriticalError("no_internet");
        else setCriticalError("login_failed");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setErrors({});
    setCriticalError(null);
    setLoading(false);
  }, []);

  return { login, loading, errors, criticalError, reset };
};

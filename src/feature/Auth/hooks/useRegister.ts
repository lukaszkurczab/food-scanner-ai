import { useState } from "react";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { authRegister } from "@/feature/Auth/services/authService";
import { isUsernameAvailable } from "@/services/usernameService";

type RegisterErrors = {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  general?: string;
};

export const useRegister = (setUser: (u: FirebaseAuthTypes.User) => void) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isStrongPassword = (p: string) =>
    p.length >= 6 &&
    p.length <= 21 &&
    /[a-z]/.test(p) &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p);

  const register = async (
    email: string,
    password: string,
    confirmPassword: string,
    username: string,
    termsAccepted: boolean
  ) => {
    const newErrors: RegisterErrors = {};
    if (!isValidEmail(email)) newErrors.email = "invalid_email";
    if (!username.trim() || username.length < 3)
      newErrors.username = "username_too_short";
    if (!isStrongPassword(password)) newErrors.password = "password_too_weak";
    if (password !== confirmPassword)
      newErrors.confirmPassword = "passwords_dont_match";
    if (!termsAccepted) newErrors.terms = "must_accept_terms";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setLoading(true);
    setErrors({});
    try {
      const available = await isUsernameAvailable(username.trim());
      if (!available) {
        setErrors({ username: "username_taken" });
        return;
      }
      const user = await authRegister(email.trim(), password, username.trim());
      setUser(user);
    } catch (error: any) {
      const e: RegisterErrors = {};
      if (error.code === "auth/email-already-in-use") e.email = "email_in_use";
      else if (error.code === "auth/invalid-email") e.email = "invalid_email";
      else if (error.code === "auth/weak-password")
        e.password = "password_too_weak";
      else e.general = "registration_failed";
      setErrors(e);
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, errors };
};

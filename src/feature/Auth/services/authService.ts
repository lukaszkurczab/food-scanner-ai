import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  type FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { logError } from "@/services/core/errorLogger";
import { initializeUserOnboardingProfile } from "@/services/user/userService";
import { resetUserRuntime } from "@/services/session/resetUserRuntime";
import i18n from "@/i18n";

function resolveInitialLanguage(language: string | undefined): "en" | "pl" {
  const normalized = (language || "").trim().toLowerCase();
  if (normalized === "pl" || normalized.startsWith("pl-")) return "pl";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return "en";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function authLogin(email: string, password: string) {
  const auth = getAuth(getApp());
  const cred = await signInWithEmailAndPassword(
    auth,
    normalizeEmail(email),
    password
  );
  return cred.user;
}

export async function authSendPasswordReset(email: string) {
  const auth = getAuth(getApp());
  await sendPasswordResetEmail(auth, normalizeEmail(email));
}

export async function authLogout(): Promise<void> {
  const auth = getAuth(getApp());
  const uid = auth.currentUser?.uid ?? null;
  let signOutError: unknown = null;

  try {
    await signOut(auth);
  } catch (error) {
    signOutError = error;
  }

  await resetUserRuntime(uid, { reason: "logout" });

  if (signOutError) {
    throw signOutError;
  }
}

export async function authRegister(
  email: string,
  password: string,
  username: string
): Promise<FirebaseAuthTypes.User> {
  const auth = getAuth(getApp());
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);
  const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

  try {
    const initialLanguage = resolveInitialLanguage(
      i18n.resolvedLanguage ?? i18n.language,
    );
    await initializeUserOnboardingProfile(
      normalizedUsername,
      initialLanguage,
    );
    return cred.user;
  } catch (e) {
    try {
      await cred.user.delete();
    } catch (deleteError) {
      logError(
        "authRegister: failed to delete Firebase user during rollback — zombie user requires manual cleanup",
        { uid: cred.user.uid },
        deleteError,
      );
    }
    throw e;
  }
}

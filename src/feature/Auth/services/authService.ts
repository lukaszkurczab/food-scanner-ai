import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  type FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { claimUsername } from "@/services/usernameService";
import { createInitialUserProfile } from "@/services/userService";
import i18n from "@/i18n";

function resolveInitialLanguage(language: string | undefined): "en" | "pl" {
  const normalized = (language || "").trim().toLowerCase();
  if (normalized === "pl" || normalized.startsWith("pl-")) return "pl";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return "en";
}

export async function authLogin(email: string, password: string) {
  const auth = getAuth(getApp());
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function authSendPasswordReset(email: string) {
  const auth = getAuth(getApp());
  await sendPasswordResetEmail(auth, email);
}

export async function authLogout(): Promise<void> {
  await signOut(getAuth(getApp()));
}

export async function authRegister(
  email: string,
  password: string,
  username: string
): Promise<FirebaseAuthTypes.User> {
  const auth = getAuth(getApp());
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  try {
    await claimUsername(username, cred.user.uid);
    const initialLanguage = resolveInitialLanguage(
      i18n.resolvedLanguage ?? i18n.language,
    );
    await createInitialUserProfile(cred.user, username, initialLanguage);
    return cred.user;
  } catch (e) {
    try {
      await cred.user.delete();
    } catch {
      // Best-effort rollback if profile creation fails.
    }
    throw e;
  }
}

import { getApp } from "@react-native-firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAuth,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  type FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { claimUsername } from "@/services/user/usernameService";
import { createInitialUserProfile } from "@/services/user/userService";
import { stopSyncLoop } from "@/services/offline/sync.engine";
import { resetOfflineStorage } from "@/services/offline/db";
import { cleanupUserOfflineAssets } from "@/services/offline/fileCleanup";
import i18n from "@/i18n";

function resolveInitialLanguage(language: string | undefined): "en" | "pl" {
  const normalized = (language || "").trim().toLowerCase();
  if (normalized === "pl" || normalized.startsWith("pl-")) return "pl";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return "en";
}

function shouldClearUserScopedKey(key: string, uid: string): boolean {
  return (
    key === `user:profile:${uid}` ||
    key === `premium_status:${uid}` ||
    key === `ai_credits:${uid}` ||
    key.includes(`:${uid}:`) ||
    key.endsWith(`:${uid}`) ||
    key.endsWith(`_${uid}`)
  );
}

async function clearScopedAsyncStorage(uid: string | null): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = uid
      ? keys.filter((key) => shouldClearUserScopedKey(key, uid))
      : [];
    keysToRemove.push("premium_status:anon");
    if (!keysToRemove.length) return;
    await AsyncStorage.multiRemove(Array.from(new Set(keysToRemove)));
  } catch {
    // Best-effort cleanup for per-user local cache.
  }
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
  const auth = getAuth(getApp());
  const uid = auth.currentUser?.uid ?? null;

  await signOut(auth);
  stopSyncLoop();
  try {
    resetOfflineStorage();
  } catch {
    // Offline reset is best-effort.
  }
  await cleanupUserOfflineAssets(uid);
  await clearScopedAsyncStorage(uid);
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

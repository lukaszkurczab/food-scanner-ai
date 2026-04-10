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
import { claimUsername, releaseUsername } from "@/services/user/usernameService";
import { logError } from "@/services/core/errorLogger";
import { cancelAllReminderScheduling } from "@/services/reminders/reminderScheduling";
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return username.trim();
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

  stopSyncLoop();
  if (uid) {
    try {
      await cancelAllReminderScheduling(uid);
    } catch {
      // Reminder cleanup is best-effort on logout.
    }
  }
  try {
    resetOfflineStorage();
  } catch {
    // Offline reset is best-effort.
  }
  try {
    await cleanupUserOfflineAssets(uid);
  } catch {
    // Filesystem cleanup is best-effort.
  }
  await clearScopedAsyncStorage(uid);

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

  let usernameClaimed = false;
  try {
    await claimUsername(normalizedUsername, cred.user.uid);
    usernameClaimed = true;
    const initialLanguage = resolveInitialLanguage(
      i18n.resolvedLanguage ?? i18n.language,
    );
    await createInitialUserProfile(cred.user, normalizedUsername, initialLanguage);
    return cred.user;
  } catch (e) {
    if (usernameClaimed) {
      try {
        await releaseUsername();
      } catch (releaseError) {
        logError(
          "authRegister: failed to release username after profile creation failure",
          { uid: cred.user.uid, username: normalizedUsername },
          releaseError,
        );
      }
    }
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

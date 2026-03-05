import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import type { UserData } from "@/types";
import type { ExportedUserData } from "@/types/user";
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updatePassword,
} from "@react-native-firebase/auth";
import { getApp } from "@react-native-firebase/app";
import { Appearance } from "react-native";
import { get, post } from "@/services/apiClient";
import { parseUserData } from "./profile.dto";
import { createServiceError } from "@/services/contracts/serviceError";
import { claimUsername } from "@/services/usernameService";
import {
  fetchUserProfileRemote,
  mergeUserProfileRemote,
  uploadUserAvatarRemote,
} from "@/services/user/userProfileRepository";

function requireCurrentUser(
  user: FirebaseAuthTypes.User | null
): FirebaseAuthTypes.User {
  if (!user) {
    throw createServiceError({
      code: "auth/not-logged-in",
      source: "UserProfileService",
      retryable: false,
    });
  }
  return user;
}

function normalizeInitialLanguage(language: string | null | undefined): "en" | "pl" {
  const normalized = String(language || "")
    .trim()
    .toLowerCase();
  if (normalized === "pl" || normalized.startsWith("pl-")) return "pl";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return "en";
}

export async function getUserLocal(uid: string): Promise<UserData | null> {
  const data = await fetchUserProfileRemote(uid);
  return data ? parseUserData(data) : null;
}

export async function upsertUserLocal(data: UserData): Promise<void> {
  await mergeUserProfileRemote(data.uid, data);
}

export async function fetchUserFromCloud(uid: string): Promise<UserData | null> {
  const data = await fetchUserProfileRemote(uid);
  return data ? parseUserData(data) : null;
}

export async function syncUserProfile(): Promise<void> {
  return;
}

export async function updateUserLanguageInFirestore(uid: string, language: string) {
  await mergeUserProfileRemote(uid, { language });
}

export async function uploadAndSaveAvatar({
  userUid,
  localUri,
}: {
  userUid: string;
  localUri: string;
}) {
  const response = await uploadUserAvatarRemote(userUid, localUri);
  return {
    avatarUrl: response.avatarUrl,
    avatarLocalPath: localUri,
    avatarlastSyncedAt: response.avatarlastSyncedAt,
  };
}

export async function changeUsernameService({
  uid,
  newUsername,
  password,
}: {
  uid: string;
  newUsername: string;
  password: string;
}) {
  const auth = getAuth(getApp());
  const current = requireCurrentUser(auth.currentUser);
  const cred = EmailAuthProvider.credential(current.email!, password);
  await reauthenticateWithCredential(current, cred);
  await claimUsername(newUsername, uid);
}

export async function changeEmailService({
  uid,
  newEmail,
  password,
}: {
  uid: string;
  newEmail: string;
  password: string;
}) {
  void uid;
  const auth = getAuth(getApp());
  const current = requireCurrentUser(auth.currentUser);
  const cred = EmailAuthProvider.credential(current.email!, password);
  await reauthenticateWithCredential(current, cred);
  await verifyBeforeUpdateEmail(current, newEmail.trim());
  await post("/users/me/email-pending", {
    email: newEmail.trim(),
  });
}

export async function changePasswordService({
  currentPassword,
  newPassword,
}: {
  currentPassword: string;
  newPassword: string;
}) {
  const auth = getAuth(getApp());
  const current = requireCurrentUser(auth.currentUser);
  const cred = EmailAuthProvider.credential(current.email!, currentPassword);
  await reauthenticateWithCredential(current, cred);
  await updatePassword(current, newPassword);
}

export async function exportUserData(uid: string) {
  void uid;
  return get<ExportedUserData>("/users/me/export");
}

export async function deleteAccountService({
  uid,
  password,
}: {
  uid: string;
  password: string;
}) {
  void uid;
  const auth = getAuth(getApp());
  const current = requireCurrentUser(auth.currentUser);
  const cred = EmailAuthProvider.credential(current.email!, password);
  await reauthenticateWithCredential(current, cred);
  await post("/users/me/delete");
  await current.delete();
}

export async function createInitialUserProfile(
  user: FirebaseAuthTypes.User,
  username: string,
  initialLanguage?: string | null,
) {
  const uid = user.uid;
  const now = Date.now();
  const profile: UserData = {
    uid,
    email: user.email ?? "",
    username: username.trim(),
    createdAt: now,
    lastLogin: new Date().toISOString(),
    plan: "free",
    unitsSystem: "metric",
    age: "",
    sex: "female",
    height: "",
    heightInch: "",
    weight: "",
    preferences: [],
    activityLevel: "moderate",
    goal: "maintain",
    chronicDiseases: [],
    chronicDiseasesOther: "",
    allergies: [],
    allergiesOther: "",
    lifestyle: "",
    aiStyle: "none",
    aiFocus: "none",
    aiFocusOther: "",
    aiNote: "",
    surveyComplited: false,
    calorieTarget: 0,
    syncState: "pending",
    lastSyncedAt: "",
    darkTheme: Appearance.getColorScheme() === "dark",
    avatarUrl: "",
    avatarLocalPath: "",
    avatarlastSyncedAt: "",
    language: normalizeInitialLanguage(initialLanguage),
  };

  await mergeUserProfileRemote(uid, profile);
}

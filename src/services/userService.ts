import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import type { UserData } from "@/types";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  writeBatch,
  deleteDoc,
} from "@react-native-firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updatePassword,
} from "@react-native-firebase/auth";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { zip } from "react-native-zip-archive";
import { Appearance } from "react-native";

export const orUndef = <T>(v: T | null | undefined): T | undefined =>
  v == null ? undefined : v;

export const arr = <T>(v: T[] | null | undefined): T[] =>
  Array.isArray(v) ? v : [];

export function asEnum<T extends string>(
  val: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof val === "string" && (allowed as readonly string[]).includes(val)
    ? (val as T)
    : fallback;
}

export function asEnumNullable<T extends string>(
  val: unknown,
  allowed: readonly T[],
  fallback: T | null = null
): T | null {
  if (val == null) return null;
  return (allowed as readonly string[]).includes(String(val))
    ? (val as T)
    : fallback;
}

function db() {
  return getFirestore(getApp());
}

const USERS = "users";

function todayLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function getUserLocal(uid: string): Promise<UserData | null> {
  const snap = await getDoc(doc(collection(db(), USERS), uid));
  return snap.exists() ? (snap.data() as UserData) : null;
}

export async function upsertUserLocal(data: UserData): Promise<void> {
  await setDoc(doc(collection(db(), USERS), data.uid), data, { merge: true });
}

export async function fetchUserFromCloud(
  uid: string
): Promise<UserData | null> {
  const snap = await getDoc(doc(collection(db(), USERS), uid));
  return snap.exists() ? (snap.data() as UserData) : null;
}

export async function syncUserProfile(_uid: string): Promise<void> {
  return;
}

export async function updateUserLanguageInFirestore(
  uid: string,
  language: string
) {
  await updateDoc(doc(collection(db(), USERS), uid), { language });
}

export async function uploadAndSaveAvatar({
  userUid,
  localUri,
}: {
  userUid: string;
  localUri: string;
}) {
  const storage = getStorage(getApp());
  const avatar = storageRef(storage, `avatars/${userUid}/avatar.jpg`);
  await putFile(avatar, localUri);
  const avatarUrl = await getDownloadURL(avatar);
  const now = new Date().toISOString();
  await updateDoc(doc(collection(db(), USERS), userUid), {
    avatarUrl,
    avatarLocalPath: localUri,
    avatarlastSyncedAt: now,
  });
  return { avatarUrl, avatarLocalPath: localUri, avatarlastSyncedAt: now };
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
  const current = auth.currentUser;
  if (!current) throw new Error("auth/not-logged-in");
  const cred = EmailAuthProvider.credential(current.email!, password);
  await reauthenticateWithCredential(current, cred);

  const dbi = db();
  const nextKey = newUsername.trim().toLowerCase();
  const userRef = doc(collection(dbi, USERS), uid);
  const usernamesRef = doc(dbi, "usernames", nextKey);

  const prevSnap = await getDoc(userRef);
  const prev = (prevSnap.data() as any)?.username;

  const batch = writeBatch(dbi);
  batch.set(usernamesRef, { uid }, { merge: true });
  batch.set(userRef, { username: newUsername.trim() }, { merge: true });
  if (prev && prev !== newUsername.trim()) {
    batch.delete(doc(dbi, "usernames", String(prev).trim().toLowerCase()));
  }
  await batch.commit();
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
  const auth = getAuth(getApp());
  const current = auth.currentUser;
  if (!current) throw new Error("auth/not-logged-in");
  const cred = EmailAuthProvider.credential(current.email!, password);
  await reauthenticateWithCredential(current, cred);
  await verifyBeforeUpdateEmail(current, newEmail.trim());
  await updateDoc(doc(collection(db(), USERS), uid), {
    emailPending: newEmail.trim(),
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
  const current = auth.currentUser;
  if (!current) throw new Error("auth/not-logged-in");
  const cred = EmailAuthProvider.credential(current.email!, currentPassword);
  await reauthenticateWithCredential(current, cred);
  await updatePassword(current, newPassword);
}

export async function exportUserData(uid: string) {
  const dbi = db();
  const userDocRef = doc(collection(dbi, USERS), uid);
  const userDocSnap = await getDoc(userDocRef);
  const profile = userDocSnap.exists() ? userDocSnap.data() : null;

  async function fetchSub(name: string) {
    const snap = await getDocs(collection(dbi, USERS, uid, name));
    return snap.docs.map((d: any) => d.data());
  }

  const meals = await fetchSub("meals");
  const chatMessages = await fetchSub("chat_messages");

  let avatarUri: string | null = null;
  try {
    const url = await getDownloadURL(
      storageRef(getStorage(getApp()), `avatars/${uid}/avatar.jpg`)
    );
    const localPath = FileSystem.documentDirectory + "avatar.jpg";
    const dl = FileSystem.createDownloadResumable(url, localPath);
    await dl.downloadAsync();
    avatarUri = localPath;
  } catch {
    avatarUri = null;
  }

  const exportData = { profile, meals, chatMessages };
  const dataJsonPath = FileSystem.documentDirectory + "user_data.json";
  await FileSystem.writeAsStringAsync(
    dataJsonPath,
    JSON.stringify(exportData, null, 2)
  );

  const files = [dataJsonPath];
  if (avatarUri) files.push(avatarUri);

  const zipPath = FileSystem.documentDirectory + "exported_user_data.zip";
  await zip(files, zipPath);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(zipPath);
  }
  return zipPath;
}

export async function deleteUserInFirestoreWithUsername(uid: string) {
  const dbi = db();
  const userRef = doc(collection(dbi, USERS), uid);
  const userSnap = await getDoc(userRef);
  const username: string | null = (userSnap.data() as any)?.username ?? null;

  const subcollections = ["meals", "chat_messages"];
  for (const sub of subcollections) {
    const subRef = collection(dbi, USERS, uid, sub);
    const snap = await getDocs(subRef);
    const batchSize = 500;
    for (let i = 0; i < snap.docs.length; i += batchSize) {
      const batch = writeBatch(dbi);
      snap.docs
        .slice(i, i + batchSize)
        .forEach((d: any) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  await deleteDoc(userRef);
  if (username) {
    await deleteDoc(doc(dbi, "usernames", username.trim().toLowerCase()));
  }
}

export async function createInitialUserProfile(
  user: FirebaseAuthTypes.User,
  username: string
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
    heightInch: null,
    weight: "",
    preferences: [],
    activityLevel: "moderate",
    goal: "maintain",
    calorieDeficit: null,
    calorieSurplus: null,
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
    syncState: "pending",
    lastSyncedAt: "",
    darkTheme: Appearance.getColorScheme() === "dark",
    avatarUrl: "",
    avatarLocalPath: "",
    avatarlastSyncedAt: "",
  } as unknown as UserData;

  await setDoc(doc(collection(db(), USERS), uid), profile, { merge: true });
}

type AiFeature = "generic" | "camera" | "text";

async function readAiUsage(uid: string): Promise<{
  date: string;
  counts: Record<AiFeature, number>;
}> {
  const ref = doc(collection(db(), USERS), uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() as any) : {};
  const today = todayLocal();

  const usage = data.aiDailyUsage || null;

  if (!usage || usage.date !== today) {
    return { date: today, counts: { generic: 0, camera: 0, text: 0 } };
  }

  if (typeof usage.count === "number") {
    return {
      date: usage.date,
      counts: { generic: Number(usage.count || 0), camera: 0, text: 0 },
    };
  }

  const counts = usage.counts || {};
  return {
    date: usage.date as string,
    counts: {
      generic: Number(counts.generic || 0),
      camera: Number(counts.camera || 0),
      text: Number(counts.text || 0),
    },
  };
}

async function writeAiUsage(
  uid: string,
  date: string,
  counts: Record<AiFeature, number>
) {
  const ref = doc(collection(db(), USERS), uid);
  await setDoc(
    ref,
    {
      aiDailyUsage: {
        date,
        counts,
      },
    },
    { merge: true }
  );
}

export async function canUseAiToday(
  uid: string,
  isPremium: boolean,
  limit = 1
) {
  if (isPremium) return true;
  const { counts } = await readAiUsage(uid);
  return counts.generic < limit;
}

export async function consumeAiUse(uid: string, isPremium: boolean, limit = 1) {
  if (isPremium) return;
  const { date, counts } = await readAiUsage(uid);
  const next = Math.min(counts.generic + 1, limit);
  counts.generic = next;
  await writeAiUsage(uid, date, counts);
}

export async function canUseAiTodayFor(
  uid: string,
  isPremium: boolean,
  feature: AiFeature,
  limit = 1
) {
  if (isPremium) return true;
  const { counts } = await readAiUsage(uid);
  return (counts[feature] ?? 0) < limit;
}

export async function consumeAiUseFor(
  uid: string,
  isPremium: boolean,
  feature: AiFeature,
  limit = 1
) {
  if (isPremium) return;
  const { date, counts } = await readAiUsage(uid);
  const prev = counts[feature] ?? 0;
  const next = Math.min(prev + 1, limit);
  counts[feature] = next;
  await writeAiUsage(uid, date, counts);
}

export async function getAiUsageState(uid: string) {
  const { date, counts } = await readAiUsage(uid);
  return { date, count: counts.generic };
}

export async function getAiUsageStateFor(uid: string, feature: AiFeature) {
  const { date, counts } = await readAiUsage(uid);
  return { date, count: counts[feature] ?? 0 };
}

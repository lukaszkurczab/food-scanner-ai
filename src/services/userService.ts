import NetInfo from "@react-native-community/netinfo";
import { Q } from "@nozbe/watermelondb";
import { database } from "@/db/database";
import UserModel from "@/db/models/User";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

import type {
  UserData,
  SyncState,
  UnitsSystem,
  Sex,
  Goal,
  ActivityLevel,
  Preference,
  ChronicDisease,
  Allergy,
  AiStyle,
  AiFocus,
} from "@/types";

import {
  UNITS,
  SEX_NON_NULL,
  GOALS,
  ACTIVITY,
  PREFERENCES,
  CHRONIC,
  ALLERGIES,
  AI_STYLE,
  AI_FOCUS,
} from "@/types/constants";

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

import { withRetry, onReconnect } from "@utils/syncUtils";

type SexNonNull = Exclude<Sex, null>;

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

function asEnumArray<T extends string>(
  vals: unknown,
  allowed: readonly T[]
): T[] {
  if (!Array.isArray(vals)) return [];
  const set = new Set(allowed as readonly string[]);
  return vals.filter((x) => typeof x === "string" && set.has(x)) as T[];
}

export async function getUserLocal(uid: string): Promise<UserData | null> {
  const users = database.get<UserModel>("users");
  const rows = await users.query(Q.where("uid", uid)).fetch();
  if (!rows.length) return null;

  const u = rows[0];

  return {
    uid: u.uid,
    email: u.email,
    username: u.username ?? "",
    plan: u.plan as UserData["plan"],
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
    surveyComplited: u.surveyComplited,
    syncState: u.syncState as SyncState,
    lastSyncedAt: orUndef(u.lastSyncedAt),

    avatarUrl: orUndef(u.avatarUrl),
    avatarLocalPath: orUndef(u.avatarLocalPath),
    avatarlastSyncedAt: orUndef(u.avatarlastSyncedAt),
    darkTheme: u.darkTheme ?? false,
    language: u.language,

    unitsSystem: asEnum<UnitsSystem>(u.unitsSystem, UNITS, "metric"),
    sex:
      u.sex == null
        ? null
        : (asEnum<SexNonNull>(u.sex, SEX_NON_NULL, "male") as Sex),
    goal: asEnum<Goal>(u.goal as any, GOALS, "maintain"),
    activityLevel: asEnum<ActivityLevel>(
      u.activityLevel as any,
      ACTIVITY,
      "light"
    ),

    preferences: asEnumArray<Preference>(u.preferences, PREFERENCES),
    chronicDiseases: asEnumArray<ChronicDisease>(u.chronicDiseases, CHRONIC),
    allergies: asEnumArray<Allergy>(u.allergies, ALLERGIES),

    height: u.height,
    heightInch: orUndef(u.heightInch),
    age: u.age,
    weight: u.weight,

    chronicDiseasesOther: orUndef(u.chronicDiseasesOther),
    allergiesOther: orUndef(u.allergiesOther),
    lifestyle: orUndef(u.lifestyle),

    aiStyle: asEnum<AiStyle>(u.aiStyle as any, AI_STYLE, "none"),
    aiFocus: asEnum<AiFocus>(u.aiFocus as any, AI_FOCUS, "none"),
    aiFocusOther: orUndef(u.aiFocusOther),
    aiNote: orUndef(u.aiNote),

    calorieDeficit: orUndef(u.calorieDeficit),
    calorieSurplus: orUndef(u.calorieSurplus),
    calorieTarget: u.calorieTarget ?? null,
  };
}

export async function upsertUserLocal(data: UserData): Promise<void> {
  const users = database.get<UserModel>("users");
  const rows = await users.query(Q.where("uid", data.uid)).fetch();

  await database.write(async () => {
    if (rows.length) {
      await rows[0].update((u) => {
        u.email = data.email;
        u.username = data.username;
        u.plan = data.plan;
        u.lastLogin = data.lastLogin;
        u.surveyComplited = data.surveyComplited;
        u.syncState = "pending";

        u.darkTheme = data.darkTheme ?? false;
        u.language = data.language;
        u.unitsSystem = data.unitsSystem;
        u.age = data.age;
        u.sex = data.sex as any;
        u.height = data.height;
        u.weight = data.weight;
        u.preferences = data.preferences ?? [];
        u.activityLevel = (data.activityLevel as any) ?? "";
        u.goal = (data.goal as any) ?? "";

        if (data.avatarUrl !== undefined) u.avatarUrl = data.avatarUrl;
        if (data.avatarLocalPath !== undefined)
          u.avatarLocalPath = data.avatarLocalPath;
        if (data.avatarlastSyncedAt !== undefined)
          u.avatarlastSyncedAt = data.avatarlastSyncedAt;
        if (data.heightInch !== undefined) u.heightInch = data.heightInch;
        if (data.calorieDeficit !== undefined)
          u.calorieDeficit = data.calorieDeficit;
        if (data.calorieSurplus !== undefined)
          u.calorieSurplus = data.calorieSurplus;
        if (data.chronicDiseases !== undefined)
          u.chronicDiseases = data.chronicDiseases;
        if (data.chronicDiseasesOther !== undefined)
          u.chronicDiseasesOther = data.chronicDiseasesOther;
        if (data.allergies !== undefined) u.allergies = data.allergies;
        if (data.allergiesOther !== undefined)
          u.allergiesOther = data.allergiesOther;
        if (data.lifestyle !== undefined) u.lifestyle = data.lifestyle;
        if (data.aiStyle !== undefined) u.aiStyle = data.aiStyle as any;
        if (data.aiFocus !== undefined) u.aiFocus = data.aiFocus as any;
        if (data.aiFocusOther !== undefined) u.aiFocusOther = data.aiFocusOther;
        if (data.aiNote !== undefined) u.aiNote = data.aiNote;
        if (data.calorieTarget !== undefined)
          u.calorieTarget = data.calorieTarget;
        if (data.lastSyncedAt !== undefined) u.lastSyncedAt = data.lastSyncedAt;
      });
    } else {
      await users.create((u) => {
        u.uid = data.uid;
        u.email = data.email;
        u.username = data.username;
        u.plan = data.plan;
        u.createdAt = data.createdAt;
        u.lastLogin = data.lastLogin;
        u.surveyComplited = data.surveyComplited;
        u.syncState = "pending";

        u.darkTheme = data.darkTheme ?? false;
        u.language = data.language;
        u.unitsSystem = data.unitsSystem;
        u.age = data.age;
        u.sex = data.sex as any;
        u.height = data.height;
        u.weight = data.weight;
        u.preferences = data.preferences ?? [];
        u.activityLevel = (data.activityLevel as any) ?? "";
        u.goal = (data.goal as any) ?? "";

        if (data.avatarUrl !== undefined) u.avatarUrl = data.avatarUrl;
        if (data.avatarLocalPath !== undefined)
          u.avatarLocalPath = data.avatarLocalPath;
        if (data.avatarlastSyncedAt !== undefined)
          u.avatarlastSyncedAt = data.avatarlastSyncedAt;
        if (data.heightInch !== undefined) u.heightInch = data.heightInch;
        if (data.calorieDeficit !== undefined)
          u.calorieDeficit = data.calorieDeficit;
        if (data.calorieSurplus !== undefined)
          u.calorieSurplus = data.calorieSurplus;
        if (data.chronicDiseases !== undefined)
          u.chronicDiseases = data.chronicDiseases;
        if (data.chronicDiseasesOther !== undefined)
          u.chronicDiseasesOther = data.chronicDiseasesOther;
        if (data.allergies !== undefined) u.allergies = data.allergies;
        if (data.allergiesOther !== undefined)
          u.allergiesOther = data.allergiesOther;
        if (data.lifestyle !== undefined) u.lifestyle = data.lifestyle;
        if (data.aiStyle !== undefined) u.aiStyle = data.aiStyle as any;
        if (data.aiFocus !== undefined) u.aiFocus = data.aiFocus as any;
        if (data.aiFocusOther !== undefined) u.aiFocusOther = data.aiFocusOther;
        if (data.aiNote !== undefined) u.aiNote = data.aiNote;
        if (data.calorieTarget !== undefined)
          u.calorieTarget = data.calorieTarget;
        if (data.lastSyncedAt !== undefined) u.lastSyncedAt = data.lastSyncedAt;
      });
    }
  });

  onReconnect(() => syncUserProfile(data.uid));
}

const USERS = "users";
function db() {
  return getFirestore(getApp());
}

export async function fetchUserFromCloud(
  uid: string
): Promise<UserData | null> {
  const snap = await getDoc(doc(collection(db(), USERS), uid));
  return snap.exists() ? (snap.data() as UserData) : null;
}

function newerIso(a?: string, b?: string) {
  const aa = a ? Date.parse(a) : 0;
  const bb = b ? Date.parse(b) : 0;
  return aa > bb;
}

export async function syncUserProfile(uid: string): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  const local = await getUserLocal(uid);
  const remote = await fetchUserFromCloud(uid);

  if (!local && !remote) return;

  if (!local && remote) {
    await upsertUserLocal({ ...remote, syncState: "synced" });
    return;
  }

  if (local && !remote) {
    await withRetry(async () => {
      await setDoc(
        doc(collection(db(), USERS), uid),
        { ...local, syncState: "synced" },
        { merge: true }
      );
    });
    await upsertUserLocal({ ...local, syncState: "synced" });
    return;
  }

  if (local && remote) {
    const takeLocal = newerIso(local.lastSyncedAt, remote.lastSyncedAt);
    if (takeLocal) {
      await withRetry(async () => {
        await setDoc(
          doc(collection(db(), USERS), uid),
          { ...local, syncState: "synced" },
          { merge: true }
        );
      });
      await upsertUserLocal({ ...local, syncState: "synced" });
    } else {
      await upsertUserLocal({ ...remote, syncState: "synced" });
    }
  }
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
  const storage = getStorage();
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
  const auth = getAuth();
  const current = auth.currentUser;
  if (!current) throw new Error("auth/not-logged-in");
  const cred = EmailAuthProvider.credential(current.email!, password);
  await reauthenticateWithCredential(current, cred);

  const dbi = db();

  const next = newUsername.trim().toLowerCase();
  await setDoc(doc(dbi, "usernames", next), { uid });

  await updateDoc(doc(collection(dbi, USERS), uid), {
    username: newUsername.trim(),
  });

  const prevSnap = await getDoc(doc(collection(dbi, USERS), uid));
  const prev = (prevSnap.data() as any)?.username;
  if (prev && prev !== newUsername.trim()) {
    await deleteDoc(doc(dbi, "usernames", String(prev).trim().toLowerCase()));
  }
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
  const auth = getAuth();
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
  const auth = getAuth();
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
      storageRef(getStorage(), `avatars/${uid}/avatar.jpg`)
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

  const profile = {
    uid,
    email: user.email,
    username: username.trim(),
    createdAt: now,
    lastLogin: new Date().toISOString(),
    plan: "free",
    unitsSystem: "metric",
    age: "",
    sex: "",
    height: "",
    heightInch: null as number | null,
    weight: "",
    preferences: [] as string[],
    activityLevel: "",
    goal: "",
    calorieDeficit: null as number | null,
    calorieSurplus: null as number | null,
    chronicDiseases: [] as string[],
    chronicDiseasesOther: "",
    allergies: [] as string[],
    allergiesOther: "",
    lifestyle: "",
    aiStyle: "none",
    aiFocus: "none",
    aiFocusOther: "",
    aiNote: "",
    surveyComplited: false,
    syncState: "pending",
    lastSyncedAt: "",
    darkTheme: false,
    avatarUrl: "",
    avatarLocalPath: "",
    avatarlastSyncedAt: "",
  };

  await upsertUserLocal(profile as any);

  await setDoc(doc(collection(db(), "users"), uid), profile, { merge: true });
}

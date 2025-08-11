import NetInfo from "@react-native-community/netinfo";
import { Q } from "@nozbe/watermelondb";
import { database } from "@/db/database";
import UserModel from "@/db/models/User";
import type { UserData, SyncState } from "@/types";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
} from "@react-native-firebase/firestore";
import { getApp } from "@react-native-firebase/app";
import { withRetry, onReconnect } from "@utils/syncUtils";

/** ========== LOCAL ========== */

import type {
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
        : (asEnum<SexNonNull>(u.sex, SEX_NON_NULL, "male") as Sex), // zawężamy do "male" | "female", a potem jako Sex
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

        // opcjonalne (ustawiamy tylko jeśli przyszły)
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

/** ========== CLOUD ========== */

const USERS = "users";
function db() {
  return getFirestore(getApp());
}

/** pobierz z chmury */
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

/** główny sync profilu (last-write-wins po lastSyncedAt) */
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

  // obie strony → wybierz nowsze
  // Uwaga: w Twoim modelu lastSyncedAt jest ISO string
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

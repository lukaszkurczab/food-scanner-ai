import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  startAfter,
  limit as fsLimit,
} from "@react-native-firebase/firestore";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import type { Meal } from "@/types/meal";
import { upsertMealLocal } from "@/services/offline/meals.repo";
import { setLastPullTs } from "@/services/offline/sync.engine";
import { debugScope } from "@/utils/debug";

const log = debugScope("Sync:Migration");

const app = getApp();
const db = getFirestore(app);

const PAGE_SIZE = 300;

function mealsCol(uid: string) {
  return collection(db, "users", uid, "meals");
}

function toISO(d: Date) {
  return d.toISOString();
}

function migrationFlag(uid: string) {
  return `initial_migration_done:${uid}`;
}

type PremiumFlags = {
  isPremium?: boolean;
  premium?: boolean;
  subscription?: { active?: boolean };
  premiumUntil?: string | number | Date | null;
};

async function resolvePremiumWindowDays(uid: string): Promise<number> {
  try {
    const uref = doc(db, "users", uid);
    const snap = await getDoc(uref);
    const data = (snap.exists() ? snap.data() : null) as PremiumFlags | null;

    const isPremium =
      !!data?.isPremium ||
      !!data?.premium ||
      !!data?.subscription?.active ||
      (!!data?.premiumUntil && new Date(data.premiumUntil) > new Date());

    return isPremium ? 90 : 30;
  } catch {
    return 30;
  }
}

export async function migrateInitialMeals(uid: string): Promise<void> {
  if (!uid) return;

  const flag = migrationFlag(uid);
  const already = await AsyncStorage.getItem(flag);
  if (already === "true") {
    log.log("skip migration: already done");
    return;
  }

  const windowDays = await resolvePremiumWindowDays(uid);
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  since.setHours(0, 0, 0, 0);
  const sinceISO = toISO(since);

  log.log("start migration", { uid, windowDays, since: sinceISO });

  let cursor: FirebaseFirestoreTypes.QueryDocumentSnapshot | null = null;
  let pulled = 0;
  let maxUpdated = "1970-01-01T00:00:00.000Z";

  const base = query(
    mealsCol(uid),
    where("timestamp", ">=", sinceISO),
    orderBy("timestamp", "asc")
  );

  for (;;) {
    const q = (
      cursor
        ? query(base, startAfter(cursor), fsLimit(PAGE_SIZE))
        : query(base, fsLimit(PAGE_SIZE))
    ) as FirebaseFirestoreTypes.Query<Meal>;
    const snap = await getDocs(q);
    if (snap.empty) break;

    for (const d of snap.docs) {
      const mealData = d.data() as Meal;
      const meal: Meal = { ...mealData, cloudId: d.id };

      try {
        await upsertMealLocal(meal);
        pulled++;

        const u = meal.updatedAt || meal.timestamp || "";
        if (u && u > maxUpdated) maxUpdated = u;
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message ?? e)
            : String(e);
        log.error("upsert local failed", d.id, msg);
      }
    }

    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }

  if (pulled > 0 && maxUpdated) {
    await setLastPullTs(uid, maxUpdated);
  }

  await AsyncStorage.setItem(flag, "true");
  log.log("migration done", { pulled, last_pull_ts: maxUpdated });
}

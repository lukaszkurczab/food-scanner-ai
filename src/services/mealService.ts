import NetInfo from "@react-native-community/netinfo";
import { Q } from "@nozbe/watermelondb";
import { database } from "@/db/database";
import MealModel from "@/db/models/Meal";
import type { Meal } from "@/types/";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
} from "@react-native-firebase/firestore";
import { getApp } from "@react-native-firebase/app";
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import { withRetry, onReconnect } from "@utils/syncUtils";

export async function getMealsLocal(userUid: string): Promise<Meal[]> {
  const mealsCollection = database.get<MealModel>("meals");
  const records = await mealsCollection
    .query(
      Q.where("userUid", userUid),
      Q.where("deleted", Q.notEq(true)),
      Q.sortBy("timestamp", Q.desc)
    )
    .fetch();

  return records.map((r) => ({
    userUid: r.userUid,
    mealId: r.mealId,
    timestamp: r.timestamp,
    type: r.type as Meal["type"],
    name: r.name ?? null,
    ingredients: r.ingredients as Meal["ingredients"],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    syncState: r.syncState as Meal["syncState"],
    source: r.source as Meal["source"],
    photoUrl: r.photoUrl ?? null,
    notes: r.notes ?? null,
    tags: (r.tags ?? []) as string[],
    deleted: r.deleted ?? false,
    cloudId: r.cloudId,
  }));
}

export async function upsertMealLocal(
  userUid: string,
  meal: Meal
): Promise<void> {
  const meals = database.get<MealModel>("meals");

  await database.write(async () => {
    const existing = await meals
      .query(Q.where("userUid", userUid), Q.where("mealId", meal.mealId))
      .fetch();

    if (existing.length) {
      await existing[0].update((m) => {
        m.timestamp = meal.timestamp;
        m.type = meal.type;
        m.name = meal.name ?? null;
        m.ingredients = meal.ingredients ?? [];
        m.updatedAt = meal.updatedAt;
        m.source = meal.source ?? "";
        m.photoUrl = meal.photoUrl ?? null;
        m.notes = meal.notes ?? null;
        m.tags = meal.tags ?? [];
        m.deleted = !!meal.deleted;
        m.syncState = "pending";
        m.cloudId = meal.cloudId;
      });
    } else {
      await meals.create((m) => {
        m.userUid = userUid;
        m.mealId = meal.mealId;
        m.timestamp = meal.timestamp;
        m.type = meal.type;
        m.name = meal.name ?? null;
        m.ingredients = meal.ingredients ?? [];
        m.createdAt = meal.createdAt;
        m.updatedAt = meal.updatedAt;
        m.syncState = "pending";
        m.source = meal.source ?? "";
        m.photoUrl = meal.photoUrl ?? null;
        m.notes = meal.notes ?? null;
        m.tags = meal.tags ?? [];
        m.deleted = !!meal.deleted;
        m.cloudId = meal.cloudId;
      });
    }
  });

  // spróbuj zsynchronizować, jeśli online
  onReconnect(() => syncMeals(userUid));
}

export async function softDeleteMealLocal(
  userUid: string,
  mealId: string
): Promise<void> {
  const meals = database.get<MealModel>("meals");
  const existing = await meals
    .query(Q.where("userUid", userUid), Q.where("mealId", mealId))
    .fetch();

  if (!existing.length) return;
  await database.write(async () => {
    await existing[0].update((m) => {
      m.deleted = true;
      m.syncState = "pending";
      m.updatedAt = new Date().toISOString();
    });
  });

  onReconnect(() => syncMeals(userUid));
}

/** ========== CLOUD (Firestore/Storage) ========== */

const USERS = "users";
const MEALS = "meals";

function db() {
  return getFirestore(getApp());
}
function storage() {
  return getStorage();
}

function isLocalPhoto(uri?: string | null) {
  return !!uri && uri.startsWith("file:");
}

async function uploadPhotoIfNeeded(
  userUid: string,
  meal: Meal
): Promise<string | null> {
  if (!isLocalPhoto(meal.photoUrl)) return meal.photoUrl ?? null;

  const path = `meals/${userUid}/${meal.cloudId ?? meal.mealId}.jpg`;
  const s = storage();
  const r = ref(s, path);
  await putFile(r, meal.photoUrl!);
  return await getDownloadURL(r);
}

/** Pobranie z chmury (np. do pełnej synchronizacji) */
export async function fetchMealsFromCloud(userUid: string): Promise<Meal[]> {
  const mealsCol = collection(db(), USERS, userUid, MEALS);
  const snap = await getDocs(mealsCol);
  return snap.docs.map((d: any) => ({ ...(d.data() as Meal), cloudId: d.id }));
}

/** ========== SYNC (local -> cloud i cloud -> local) ========== */

function newer(localIso: string, remoteIso: string) {
  const l = Date.parse(localIso || "0");
  const r = Date.parse(remoteIso || "0");
  return l > r;
}

/** Główna synchronizacja posiłków dla danego usera */
export async function syncMeals(userUid: string): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  const mealsCol = database.get<MealModel>("meals");

  // 1) WYŚLIJ PENDING/CONFLICT W GÓRĘ
  const dirty = await mealsCol
    .query(
      Q.where("userUid", userUid),
      Q.where("syncState", Q.oneOf(["pending", "conflict"]))
    )
    .fetch();

  for (const rec of dirty) {
    await withRetry(async () => {
      // składamy obiekt Meal z rekordu
      const m: Meal = {
        userUid: rec.userUid,
        mealId: rec.mealId,
        timestamp: rec.timestamp,
        type: rec.type as Meal["type"],
        name: rec.name ?? null,
        ingredients: (rec.ingredients ?? []) as Meal["ingredients"],
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
        syncState: "synced",
        source: rec.source as Meal["source"],
        photoUrl: rec.photoUrl ?? null,
        notes: rec.notes ?? null,
        tags: (rec.tags ?? []) as string[],
        deleted: rec.deleted ?? false,
        cloudId: rec.cloudId,
      };

      // upload zdjęcia jeśli lokalne
      const photoUrl = await uploadPhotoIfNeeded(userUid, m);
      if (photoUrl && photoUrl !== m.photoUrl) m.photoUrl = photoUrl;

      const firestore = db();
      if (!m.cloudId) {
        const newRef = await addDoc(
          collection(firestore, USERS, userUid, MEALS),
          m
        );
        await database.write(async () => {
          await rec.update((r) => {
            r.cloudId = newRef.id;
            r.syncState = "synced";
          });
        });
      } else {
        const refDoc = doc(firestore, USERS, userUid, MEALS, m.cloudId);
        await setDoc(refDoc, m, { merge: true });
        await database.write(async () => {
          await rec.update((r) => {
            r.syncState = "synced";
          });
        });
      }
    });
  }

  // 2) POBIERZ Z CHMURY I ZMERGUJ W DÓŁ
  const remote = await fetchMealsFromCloud(userUid);
  const localByMealId = new Map<string, MealModel>();
  (await mealsCol.query(Q.where("userUid", userUid)).fetch()).forEach((r) =>
    localByMealId.set(r.mealId, r)
  );

  for (const rm of remote) {
    const localRec = localByMealId.get(rm.mealId);
    if (!localRec) {
      // nowy rekord z chmury
      await database.write(async () => {
        await mealsCol.create((m) => {
          m.userUid = rm.userUid;
          m.mealId = rm.mealId;
          m.timestamp = rm.timestamp;
          m.type = rm.type;
          m.name = rm.name ?? null;
          m.ingredients = rm.ingredients ?? [];
          m.createdAt = rm.createdAt;
          m.updatedAt = rm.updatedAt;
          m.syncState = "synced";
          m.source = rm.source ?? "";
          m.photoUrl = rm.photoUrl ?? null;
          m.notes = rm.notes ?? null;
          m.tags = rm.tags ?? [];
          m.deleted = !!rm.deleted;
          m.cloudId = rm.cloudId;
        });
      });
    } else {
      // konflikt: wybieramy nowszy updatedAt (ISO)
      const takeRemote = newer(rm.updatedAt, localRec.updatedAt);
      if (takeRemote) {
        await database.write(async () => {
          await localRec.update((m) => {
            m.timestamp = rm.timestamp;
            m.type = rm.type;
            m.name = rm.name ?? null;
            m.ingredients = rm.ingredients ?? [];
            m.createdAt = rm.createdAt;
            m.updatedAt = rm.updatedAt;
            m.syncState = "synced";
            m.source = rm.source ?? "";
            m.photoUrl = rm.photoUrl ?? null;
            m.notes = rm.notes ?? null;
            m.tags = rm.tags ?? [];
            m.deleted = !!rm.deleted;
            m.cloudId = rm.cloudId;
          });
        });
      }
    }
  }
}

// --- HELPER: pojedynczy upsert do Firestore + zdjęcie ---
export async function upsertMealWithPhoto(
  userUid: string,
  meal: Meal,
  photoUri: string | null
): Promise<void> {
  // jeśli lokalne zdjęcie, wyślij i podmień URL
  let next = { ...meal };
  if (photoUri && photoUri.startsWith("file:")) {
    const url = await uploadPhotoIfNeeded(userUid, {
      ...meal,
      photoUrl: photoUri,
    });
    if (url) next.photoUrl = url;
  }

  const firestore = db();
  if (!next.cloudId) {
    const ref = await addDoc(
      collection(firestore, USERS, userUid, MEALS),
      next
    );
    next.cloudId = ref.id;
  } else {
    await setDoc(doc(firestore, USERS, userUid, MEALS, next.cloudId), next, {
      merge: true,
    });
  }

  // lokalny rekord oznacz jako zsynchronizowany
  const meals = database.get<MealModel>("meals");
  const rows = await meals
    .query(Q.where("userUid", userUid), Q.where("mealId", next.mealId))
    .fetch();
  if (rows[0]) {
    await database.write(async () => {
      await rows[0].update((m: any) => {
        m.syncState = "synced";
        if (!m.cloudId) m.cloudId = next.cloudId!;
        m.updatedAt = new Date().toISOString();
        if (next.photoUrl) m.photoUrl = next.photoUrl;
      });
    });
  }
}

// --- HELPER: miękkie usunięcie posiłku w Firestore (+ lokalny stan) ---
export async function deleteMealInFirestore(
  userUid: string,
  cloudId: string
): Promise<void> {
  const firestore = db();
  await setDoc(
    doc(firestore, USERS, userUid, MEALS, cloudId),
    { deleted: true, syncState: "synced", updatedAt: new Date().toISOString() },
    { merge: true }
  );

  // lokalnie przestaw na deleted + synced
  const meals = database.get<MealModel>("meals");
  const rows = await meals
    .query(Q.where("userUid", userUid), Q.where("cloudId", cloudId))
    .fetch();
  if (rows[0]) {
    await database.write(async () => {
      await rows[0].update((m: any) => {
        m.deleted = true;
        m.syncState = "synced";
        m.updatedAt = new Date().toISOString();
      });
    });
  }
}

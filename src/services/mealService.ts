import NetInfo from "@react-native-community/netinfo";
import { Q } from "@nozbe/watermelondb";
import { database } from "@/db/database";
import MealModel from "@/db/models/Meal";
import type { Meal } from "@/types/";
import firestore from "@react-native-firebase/firestore";
import storageMod from "@react-native-firebase/storage";
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

export async function getMealsPage(
  userUid: string,
  opts: { limit: number; before?: string | null }
): Promise<{ items: Meal[]; nextBefore: string | null }> {
  const { limit, before } = opts;
  const mealsCollection = database.get<MealModel>("meals");

  const clauses = [
    Q.where("userUid", userUid),
    Q.where("deleted", Q.notEq(true)),
    Q.sortBy("timestamp", Q.desc),
  ] as any[];

  if (before) {
    clauses.push(Q.where("timestamp", Q.lt(before)));
  }

  const records = await mealsCollection.query(...clauses).fetch();

  const page = records.slice(0, limit).map((r) => ({
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

  const nextBefore = page.length > 0 ? page[page.length - 1].timestamp : null;

  return { items: page, nextBefore };
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

const USERS = "users";
const MEALS = "meals";

const storage = () => storageMod();

function isLocalPhoto(uri?: string | null) {
  return !!uri && uri.startsWith("file:");
}

async function uploadPhotoIfNeeded(
  userUid: string,
  meal: Meal
): Promise<string | null> {
  if (!isLocalPhoto(meal.photoUrl)) return meal.photoUrl ?? null;
  const path = `meals/${userUid}/${meal.cloudId ?? meal.mealId}.jpg`;
  const r = storage().ref(path);
  await r.putFile(meal.photoUrl!);
  return await r.getDownloadURL();
}

export async function fetchMealsFromCloud(userUid: string): Promise<Meal[]> {
  const snap = await firestore()
    .collection(USERS)
    .doc(userUid)
    .collection(MEALS)
    .get();
  return snap.docs.map((d) => ({ ...(d.data() as Meal), cloudId: d.id }));
}

function newer(localIso: string, remoteIso: string) {
  const l = Date.parse(localIso || "0");
  const r = Date.parse(remoteIso || "0");
  return l > r;
}

export async function syncMeals(userUid: string): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  const mealsCol = database.get<MealModel>("meals");

  const dirty = await mealsCol
    .query(
      Q.where("userUid", userUid),
      Q.where("syncState", Q.oneOf(["pending", "conflict"]))
    )
    .fetch();

  for (const rec of dirty) {
    await withRetry(async () => {
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

      const photoUrl = await uploadPhotoIfNeeded(userUid, m);
      if (photoUrl && photoUrl !== m.photoUrl) m.photoUrl = photoUrl;

      const col = firestore().collection(USERS).doc(userUid).collection(MEALS);

      if (!m.cloudId) {
        const newRef = await col.add(m);
        await database.write(async () => {
          await rec.update((r) => {
            r.cloudId = newRef.id;
            r.syncState = "synced";
          });
        });
      } else {
        await col.doc(m.cloudId).set(m, { merge: true });
        await database.write(async () => {
          await rec.update((r) => {
            r.syncState = "synced";
          });
        });
      }
    });
  }

  const remote = await fetchMealsFromCloud(userUid);
  const localByMealId = new Map<string, MealModel>();
  (await mealsCol.query(Q.where("userUid", userUid)).fetch()).forEach((r) =>
    localByMealId.set(r.mealId, r)
  );

  for (const rm of remote) {
    const localRec = localByMealId.get(rm.mealId);
    if (!localRec) {
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

export async function upsertMealWithPhoto(
  userUid: string,
  meal: Meal,
  photoUri: string | null
): Promise<void> {
  const step = (n: string, extra: any = {}) =>
    console.log("[MEALS] STEP_" + n, extra);

  let next = { ...meal };
  try {
    step("A_BEGIN", { userUid, mealId: meal.mealId, cloudId: meal.cloudId });

    if (photoUri && photoUri.startsWith("file:")) {
      step("B_UPLOAD_TRY");
      const url = await uploadPhotoIfNeeded(userUid, {
        ...meal,
        photoUrl: photoUri,
      });
      step("B_UPLOAD_OK", { uploaded: !!url });
      if (url) next.photoUrl = url;
    }

    const col = firestore().collection(USERS).doc(userUid).collection(MEALS);

    if (!next.cloudId) {
      step("C_ADD_TRY");
      const ref = await col.add(next);
      next.cloudId = ref.id;
      step("C_ADD_OK", { cloudId: next.cloudId });
    } else {
      step("C_SET_TRY", { cloudId: next.cloudId });
      await col.doc(next.cloudId).set(next, { merge: true });
      step("C_SET_OK");
    }

    step("D_LOCAL_FETCH_TRY");
    const meals = database.get<MealModel>("meals");
    const rows = await meals
      .query(Q.where("userUid", userUid), Q.where("mealId", next.mealId))
      .fetch();
    step("D_LOCAL_FETCH_OK", { found: rows.length });

    if (rows[0]) {
      step("E_LOCAL_UPDATE_TRY");
      await database.write(async () => {
        await rows[0].update((m: any) => {
          m.syncState = "synced";
          if (!m.cloudId) m.cloudId = next.cloudId!;
          m.updatedAt = new Date().toISOString();
          if (next.photoUrl) m.photoUrl = next.photoUrl;
        });
      });
      step("E_LOCAL_UPDATE_OK");
    } else {
      console.warn("[MEALS] D_LOCAL_NOT_FOUND", { mealId: next.mealId });
    }

    step("Z_DONE");
  } catch (e: any) {
    console.error(
      "[MEALS] FATAL",
      e?.message || e,
      "\nSTACK:\n",
      e?.stack || "(no stack)"
    );
    throw e;
  }
}

export async function deleteMealInFirestore(
  userUid: string,
  cloudId: string
): Promise<void> {
  const col = firestore().collection(USERS).doc(userUid).collection(MEALS);
  await col.doc(cloudId).set(
    {
      deleted: true,
      syncState: "synced",
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

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

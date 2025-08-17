import NetInfo from "@react-native-community/netinfo";
import { Q } from "@nozbe/watermelondb";
import { database } from "@/db/database";
import MyMealModel from "@/db/models/MyMeal";
import type { Meal } from "@/types/meal";
import firestore from "@react-native-firebase/firestore";
import storageMod from "@react-native-firebase/storage";
import { withRetry } from "@/utils/syncUtils";

const USERS = "users";
const MY_MEALS = "myMeals";

const storage = () => storageMod();

const isLocalPhoto = (uri?: string | null) => !!uri && uri.startsWith("file:");

async function uploadPhotoIfNeeded(
  userUid: string,
  meal: Meal
): Promise<string | null> {
  if (!isLocalPhoto(meal.photoUrl)) return meal.photoUrl ?? null;
  const path = `myMeals/${userUid}/${meal.cloudId ?? meal.mealId}.jpg`;
  const r = storage().ref(path);
  await r.putFile(meal.photoUrl!);
  return await r.getDownloadURL();
}

export async function upsertMyMealLocal(
  userUid: string,
  meal: Meal
): Promise<void> {
  const table = database.get<MyMealModel>("myMeals");
  await database.write(async () => {
    const rows = await table
      .query(Q.where("userUid", userUid), Q.where("mealId", meal.mealId))
      .fetch();
    if (rows[0]) {
      await rows[0].update((m) => {
        m.timestamp = meal.timestamp;
        m.type = meal.type;
        m.name = meal.name ?? null;
        (m as any).ingredients = meal.ingredients ?? [];
        m.updatedAt = meal.updatedAt;
        m.source = meal.source ?? "";
        m.photoUrl = meal.photoUrl ?? null;
        m.notes = meal.notes ?? null;
        (m as any).tags = meal.tags ?? [];
        m.deleted = !!meal.deleted;
        m.syncState = "pending";
        m.cloudId = meal.cloudId;
      });
    } else {
      await table.create((m) => {
        m.userUid = userUid;
        m.mealId = meal.mealId;
        m.timestamp = meal.timestamp;
        m.type = meal.type;
        m.name = meal.name ?? null;
        (m as any).ingredients = meal.ingredients ?? [];
        m.createdAt = meal.createdAt;
        m.updatedAt = meal.updatedAt;
        m.syncState = "pending";
        m.source = meal.source ?? "";
        m.photoUrl = meal.photoUrl ?? null;
        m.notes = meal.notes ?? null;
        (m as any).tags = meal.tags ?? [];
        m.deleted = !!meal.deleted;
        m.cloudId = meal.cloudId;
      });
    }
  });
}

export async function fetchMyMealsFromCloud(userUid: string): Promise<Meal[]> {
  const snap = await firestore()
    .collection(USERS)
    .doc(userUid)
    .collection(MY_MEALS)
    .get();
  return snap.docs.map((d) => ({ ...(d.data() as Meal), cloudId: d.id }));
}

export async function upsertMyMealWithPhoto(
  userUid: string,
  meal: Meal,
  photoUri: string | null
) {
  const col = firestore().collection(USERS).doc(userUid).collection(MY_MEALS);

  const next: Meal = {
    ...meal,
    // stały klucz dokumentu = mealId (idempotencja)
    cloudId: meal.cloudId ?? meal.mealId,
    updatedAt: new Date().toISOString(),
    createdAt: meal.createdAt ?? new Date().toISOString(),
  };

  const uploaded = await uploadPhotoIfNeeded(userUid, {
    ...meal,
    photoUrl: photoUri ?? meal.photoUrl ?? null,
  });
  if (uploaded) next.photoUrl = uploaded;

  await col.doc(next.cloudId!).set(next, { merge: true });

  try {
    const table = database.get<MyMealModel>("myMeals");
    const rows = await table
      .query(Q.where("userUid", userUid), Q.where("mealId", next.mealId))
      .fetch();
    if (rows[0]) {
      await database.write(async () => {
        await rows[0].update((m: any) => {
          m.syncState = "synced";
          m.updatedAt = new Date().toISOString();
          m.cloudId = next.cloudId!;
          if (next.photoUrl) m.photoUrl = next.photoUrl;
        });
      });
    }
  } catch (e) {
    // nie przerywaj — zapis w chmurze się udał, nie chcemy retrysów i duplikatów
    console.warn("[MYMEALS] local update warning:", (e as any)?.message || e);
  }
}

export async function deleteMyMealInFirestore(
  userUid: string,
  cloudId: string
) {
  await firestore()
    .collection(USERS)
    .doc(userUid)
    .collection(MY_MEALS)
    .doc(cloudId)
    .set(
      {
        deleted: true,
        syncState: "synced",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

  const table = database.get<MyMealModel>("myMeals");
  const rows = await table
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

export async function syncMyMeals(userUid: string) {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  const table = database.get<MyMealModel>("myMeals");
  const dirty = await table
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
        ingredients: (rec as any).ingredients ?? [],
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
        syncState: "synced",
        source: rec.source as Meal["source"],
        photoUrl: rec.photoUrl ?? null,
        notes: rec.notes ?? null,
        tags: (rec as any).tags ?? [],
        deleted: rec.deleted ?? false,
        cloudId: rec.cloudId ?? rec.mealId,
      };

      const col = firestore()
        .collection(USERS)
        .doc(userUid)
        .collection(MY_MEALS);
      const photoUrl = await uploadPhotoIfNeeded(userUid, m);
      if (photoUrl && photoUrl !== m.photoUrl) m.photoUrl = photoUrl;

      await col.doc(m.cloudId!).set(m, { merge: true });

      await database.write(async () => {
        await rec.update((r) => {
          r.cloudId = m.cloudId!;
          r.syncState = "synced";
        });
      });
    });
  }

  const remote = await fetchMyMealsFromCloud(userUid);
  const localById = new Map<string, MyMealModel>();
  (await table.query(Q.where("userUid", userUid)).fetch()).forEach((r) =>
    localById.set(r.mealId, r)
  );

  for (const rm of remote) {
    const local = localById.get(rm.mealId);
    if (!local) {
      await database.write(async () => {
        await table.create((m) => {
          m.userUid = rm.userUid;
          m.mealId = rm.mealId;
          m.timestamp = rm.timestamp;
          m.type = rm.type;
          m.name = rm.name ?? null;
          (m as any).ingredients = rm.ingredients ?? [];
          m.createdAt = rm.createdAt;
          m.updatedAt = rm.updatedAt;
          m.syncState = "synced";
          m.source = rm.source ?? "";
          m.photoUrl = rm.photoUrl ?? null;
          m.notes = rm.notes ?? null;
          (m as any).tags = rm.tags ?? [];
          m.deleted = !!rm.deleted;
          m.cloudId = rm.cloudId ?? rm.mealId;
        });
      });
    } else {
      const takeRemote =
        Date.parse(rm.updatedAt || "0") > Date.parse(local.updatedAt || "0");
      if (takeRemote) {
        await database.write(async () => {
          await local.update((m) => {
            m.timestamp = rm.timestamp;
            m.type = rm.type;
            m.name = rm.name ?? null;
            (m as any).ingredients = rm.ingredients ?? [];
            m.createdAt = rm.createdAt;
            m.updatedAt = rm.updatedAt;
            m.syncState = "synced";
            m.source = rm.source ?? "";
            m.photoUrl = rm.photoUrl ?? null;
            m.notes = rm.notes ?? null;
            (m as any).tags = rm.tags ?? [];
            m.deleted = !!rm.deleted;
            m.cloudId = rm.cloudId ?? rm.mealId;
          });
        });
      }
    }
  }
}

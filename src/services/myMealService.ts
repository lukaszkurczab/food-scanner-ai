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
  if (!isLocalPhoto(meal.photoUrl)) {
    console.log("[MYMEALS] uploadPhotoIfNeeded skip", {
      userUid,
      mealId: meal.mealId,
      hasPhoto: !!meal.photoUrl,
    });
    return meal.photoUrl ?? null;
  }
  const path = `myMeals/${userUid}/${meal.cloudId ?? meal.mealId}.jpg`;
  const r = storage().ref(path);
  try {
    console.log("[MYMEALS] uploadPhotoIfNeeded putFile start", { path });
    await r.putFile(meal.photoUrl!);
    const url = await r.getDownloadURL();
    console.log("[MYMEALS] uploadPhotoIfNeeded done", { url });
    return url;
  } catch (e: any) {
    console.error("[MYMEALS] uploadPhotoIfNeeded error", e?.message || e);
    throw e;
  }
}

export async function upsertMyMealLocal(
  userUid: string,
  meal: Meal
): Promise<void> {
  const table = database.get<MyMealModel>("myMeals");
  console.log("[MYMEALS] upsertMyMealLocal start", {
    userUid,
    mealId: meal.mealId,
    cloudId: meal.cloudId,
  });
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
      console.log("[MYMEALS] upsertMyMealLocal updated");
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
      console.log("[MYMEALS] upsertMyMealLocal created");
    }
  });
  console.log("[MYMEALS] upsertMyMealLocal done");
}

export async function fetchMyMealsFromCloud(userUid: string): Promise<Meal[]> {
  const snap = await firestore()
    .collection(USERS)
    .doc(userUid)
    .collection(MY_MEALS)
    .get();
  const items = snap.docs.map((d) => ({
    ...(d.data() as Meal),
    cloudId: d.id,
  }));
  console.log("[MYMEALS] fetchMyMealsFromCloud", {
    count: items.length,
    userUid,
  });
  return items;
}

export async function upsertMyMealWithPhoto(
  userUid: string,
  meal: Meal,
  photoUri: string | null
) {
  const step = (n: string, extra: any = {}) =>
    console.log("[MYMEALS] STEP_" + n, extra);

  let next = { ...meal };
  const now = new Date().toISOString();
  next.createdAt = next.createdAt ?? now;
  next.updatedAt = now;

  try {
    step("A_BEGIN", { userUid, mealId: meal.mealId, cloudId: meal.cloudId });

    let uploadedUrl: string | null = null;
    try {
      step("B_UPLOAD_TRY");
      uploadedUrl = await uploadPhotoIfNeeded(userUid, {
        ...meal,
        photoUrl: photoUri ?? meal.photoUrl ?? null,
      });
      step("B_UPLOAD_OK", { uploaded: !!uploadedUrl });
    } catch (e: any) {
      console.error("[MYMEALS] B_UPLOAD_ERR", e?.message || e, e?.stack);
    }
    if (uploadedUrl) next.photoUrl = uploadedUrl;

    const col = firestore().collection(USERS).doc(userUid).collection(MY_MEALS);

    if (!next.cloudId) {
      step("C_ADD_TRY");
      const refDoc = await col.add(next);
      next.cloudId = refDoc.id;
      step("C_ADD_OK", { cloudId: next.cloudId });
    } else {
      step("C_SET_TRY", { cloudId: next.cloudId });
      await col.doc(next.cloudId).set(next, { merge: true });
      step("C_SET_OK");
    }

    step("D_LOCAL_FETCH_TRY");
    const table = database.get<MyMealModel>("myMeals");
    const rows = await table
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
      console.warn("[MYMEALS] D_LOCAL_NOT_FOUND", { mealId: next.mealId });
    }

    step("Z_DONE");
  } catch (e: any) {
    console.error(
      "[MYMEALS] FATAL",
      e?.message || e,
      "\nSTACK:\n",
      e?.stack || "(no stack)"
    );
    throw e;
  }
}

export async function deleteMyMealInFirestore(
  userUid: string,
  cloudId: string
) {
  console.log("[MYMEALS] deleteMyMealInFirestore", { userUid, cloudId });
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
  if (!net.isConnected) {
    console.log("[MYMEALS] syncMyMeals offline");
    return;
  }

  const table = database.get<MyMealModel>("myMeals");
  const dirty = await table
    .query(
      Q.where("userUid", userUid),
      Q.where("syncState", Q.oneOf(["pending", "conflict"]))
    )
    .fetch();

  console.log("[MYMEALS] syncMyMeals dirty", { count: dirty.length, userUid });

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
        cloudId: rec.cloudId,
      };

      console.log("[MYMEALS] pushing dirty record", {
        mealId: m.mealId,
        cloudId: m.cloudId,
        hasPhoto: !!m.photoUrl,
      });

      const photoUrl = await uploadPhotoIfNeeded(userUid, m);
      if (photoUrl && photoUrl !== m.photoUrl) m.photoUrl = photoUrl;

      const col = firestore()
        .collection(USERS)
        .doc(userUid)
        .collection(MY_MEALS);

      if (!m.cloudId) {
        const newRef = await col.add(m);
        await database.write(async () => {
          await rec.update((r) => {
            r.cloudId = newRef.id;
            r.syncState = "synced";
          });
        });
        console.log("[MYMEALS] dirty add done", { cloudId: newRef.id });
      } else {
        await col.doc(m.cloudId).set(m, { merge: true });
        await database.write(async () => {
          await rec.update((r) => {
            r.syncState = "synced";
          });
        });
        console.log("[MYMEALS] dirty set done", { cloudId: m.cloudId });
      }
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
          m.cloudId = rm.cloudId;
        });
      });
      console.log("[MYMEALS] pulled remote create", { mealId: rm.mealId });
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
            m.cloudId = rm.cloudId;
          });
        });
        console.log("[MYMEALS] pulled remote update", { mealId: rm.mealId });
      }
    }
  }
}

import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from "@react-native-firebase/firestore";
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "@react-native-firebase/auth";
import type { UserData } from "@/src/types";

const USERS_COLLECTION = "users";

function getDb() {
  const app = getApp();
  return getFirestore(app);
}

async function deleteSubcollection(
  parentDocRef: ReturnType<typeof doc>,
  subcollectionName: string
) {
  const subcollectionRef = collection(parentDocRef, subcollectionName);
  const snapshot = await getDocs(subcollectionRef);
  const batchSize = 500;
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batchDocs = docs.slice(i, i + batchSize);
    const db = getDb();
    const batch = writeBatch(db);
    batchDocs.forEach((d: any) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function fetchUserFromFirestore(
  uid: string
): Promise<UserData | null> {
  const db = getDb();
  const userDoc = await getDoc(doc(collection(db, USERS_COLLECTION), uid));
  return userDoc.exists() ? (userDoc.data() as UserData) : null;
}

export async function updateUserInFirestore(
  uid: string,
  data: Partial<UserData>
) {
  const db = getDb();
  await setDoc(doc(collection(db, USERS_COLLECTION), uid), data, {
    merge: true,
  });
}

export async function uploadAndSaveAvatar({
  userUid,
  localUri,
}: {
  userUid: string;
  localUri: string;
}) {
  const app = getApp();
  const storage = getStorage(app);
  const remotePath = `avatars/${userUid}/avatar.jpg`;
  const avatarRef = ref(storage, remotePath);
  await putFile(avatarRef, localUri);
  const avatarUrl = await getDownloadURL(avatarRef);
  const db = getDb();
  const userDocRef = doc(collection(db, USERS_COLLECTION), userUid);
  const now = new Date().toISOString();
  await updateDoc(userDocRef, {
    avatarUrl,
    avatarLocalPath: localUri,
    avatarlastSyncedAt: now,
  });
  return {
    avatarUrl,
    avatarLocalPath: localUri,
    avatarlastSyncedAt: now,
  };
}

export async function markUserSyncedInFirestore(
  uid: string,
  timestamp: string
) {
  const db = getDb();
  await updateDoc(doc(collection(db, USERS_COLLECTION), uid), {
    syncStatus: "synced",
    lastSyncedAt: timestamp,
  });
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const app = getApp();
  const db = getFirestore(app);
  const usernameRef = doc(db, "usernames", username.trim().toLowerCase());
  const usernameDoc = await getDoc(usernameRef);
  return !usernameDoc.exists();
}

export async function deleteUserInFirestoreWithUsername(uid: string) {
  const db = getDb();
  const userDocRef = doc(collection(db, USERS_COLLECTION), uid);
  const userDoc = await getDoc(doc(collection(db, USERS_COLLECTION), uid));
  let username: string | null = null;
  if (userDoc.exists()) {
    username = (userDoc.data() as { username?: string })?.username ?? null;
  }
  const subcollections = ["meals", "chatMessages"];
  for (const sub of subcollections) {
    try {
      await deleteSubcollection(userDocRef, sub);
    } catch (e) {
      console.log(e);
    }
  }
  await deleteDoc(userDocRef);
  if (username) {
    const usernameDocRef = doc(db, "usernames", username.trim().toLowerCase());
    await deleteDoc(usernameDocRef);
  }
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
  const db = getDb();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("auth/not-logged-in");

  const cred = EmailAuthProvider.credential(currentUser.email!, password);
  await reauthenticateWithCredential(currentUser, cred);

  const userRef = doc(collection(db, USERS_COLLECTION), uid);
  const oldUserDoc = await getDoc(userRef);
  const oldUsername = (oldUserDoc.data() as { username?: string })?.username;

  await setDoc(doc(db, "usernames", newUsername.trim().toLowerCase()), { uid });
  await updateDoc(userRef, { username: newUsername.trim() });
  if (oldUsername && oldUsername !== newUsername.trim()) {
    await deleteDoc(doc(db, "usernames", oldUsername.trim().toLowerCase()));
  }
}

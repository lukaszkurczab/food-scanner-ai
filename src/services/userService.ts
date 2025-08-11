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
  addDoc,
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
  verifyBeforeUpdateEmail,
  updatePassword,
} from "@react-native-firebase/auth";
import type { ExportedUserData, UserData } from "@/types";
import * as FileSystem from "expo-file-system";
import { zip } from "react-native-zip-archive";
import * as Sharing from "expo-sharing";
import { v4 as uuidv4 } from "uuid";

const USERS_COLLECTION = "users";
const FEEDBACKS_COLLECTION = "feedbacks";

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
  const storage = getStorage();
  const avatarRef = ref(storage, `avatars/${userUid}/avatar.jpg`);
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
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("auth/not-logged-in");

  const cred = EmailAuthProvider.credential(currentUser.email!, password);
  await reauthenticateWithCredential(currentUser, cred);

  await verifyBeforeUpdateEmail(currentUser, newEmail.trim());

  const db = getFirestore(getApp());
  const userRef = doc(collection(db, "users"), uid);
  await updateDoc(userRef, { emailPending: newEmail.trim() });

  return true;
}

export async function changePasswordService({
  currentPassword,
  newPassword,
}: {
  currentPassword: string;
  newPassword: string;
}) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("auth/not-logged-in");

  const cred = EmailAuthProvider.credential(
    currentUser.email!,
    currentPassword
  );
  await reauthenticateWithCredential(currentUser, cred);

  await updatePassword(currentUser, newPassword);

  return true;
}

export async function exportUserData(uid: string) {
  const db = getFirestore();
  const storage = getStorage();

  const userDocRef = doc(collection(db, "users"), uid);
  const userDocSnap = await getDoc(userDocRef);
  const profile = userDocSnap.exists() ? userDocSnap.data() : null;

  async function fetchSubcollection(name: string) {
    const subRef = collection(db, "users", uid, name);
    const snap = await getDocs(subRef);
    return snap.docs.map((doc: any) => doc.data());
  }

  const meals = await fetchSubcollection("meals");
  const chatMessages = await fetchSubcollection("chatMessages");

  let avatarUri = null;
  try {
    const avatarRef = ref(storage, `avatars/${uid}/avatar.jpg`);
    const avatarUrl = await getDownloadURL(avatarRef);

    const localAvatarPath = FileSystem.documentDirectory + "avatar.jpg";
    const downloadResumable = FileSystem.createDownloadResumable(
      avatarUrl,
      localAvatarPath
    );
    await downloadResumable.downloadAsync();
    avatarUri = localAvatarPath;
  } catch (e) {
    avatarUri = null;
  }

  const exportData: ExportedUserData = { profile, meals, chatMessages };
  const dataJsonPath = FileSystem.documentDirectory + "user_data.json";
  await FileSystem.writeAsStringAsync(
    dataJsonPath,
    JSON.stringify(exportData, null, 2)
  );

  const filesToZip = [dataJsonPath];
  if (avatarUri) filesToZip.push(avatarUri);

  const zipPath = FileSystem.documentDirectory + "exported_user_data.zip";
  await zip(filesToZip, zipPath);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(zipPath);
  }

  return zipPath;
}

export async function updateUserLanguageInFirestore(
  uid: string,
  language: string
) {
  const db = getDb();
  const userRef = doc(collection(db, USERS_COLLECTION), uid);
  await updateDoc(userRef, { language });
}

export async function fetchUserLanguageFromFirestore(
  uid: string
): Promise<string | null> {
  const db = getDb();
  const userRef = doc(collection(db, USERS_COLLECTION), uid);
  const docSnap = await getDoc(userRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data() as Partial<UserData>;
  return data.language ?? null;
}

export async function sendFeedback({
  message,
  attachmentUri,
  userUid,
  email,
  deviceInfo,
}: {
  message: string;
  attachmentUri?: string | null;
  userUid?: string | null;
  email?: string | null;
  deviceInfo?: any;
}): Promise<void> {
  const db = getDb();
  const feedbackId = uuidv4() as string;
  let attachmentUrl: string | null = null;

  if (attachmentUri) {
    const storage = getStorage();
    const filename = attachmentUri.split("/").pop() || "attachment.jpg";
    const storageRef = ref(storage, `feedbacks/${feedbackId}/${filename}`);
    await putFile(storageRef, attachmentUri);
    attachmentUrl = await getDownloadURL(storageRef);
  }

  await addDoc(collection(db, FEEDBACKS_COLLECTION), {
    feedbackId,
    userUid: userUid || null,
    email: email || null,
    message,
    attachmentUrl,
    deviceInfo: deviceInfo || null,
    createdAt: new Date().toISOString(),
  });
}

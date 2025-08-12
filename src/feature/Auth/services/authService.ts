import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  type FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { reserveUsername } from "@/services/usernameService";
import { createInitialUserProfile } from "@/services/userService";

export async function authLogin(email: string, password: string) {
  const auth = getAuth(getApp());
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function authSendPasswordReset(email: string) {
  const auth = getAuth(getApp());
  await sendPasswordResetEmail(auth, email);
}

export async function authRegister(
  email: string,
  password: string,
  username: string
): Promise<FirebaseAuthTypes.User> {
  const auth = getAuth(getApp());
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  try {
    await reserveUsername(username, cred.user.uid);
    await createInitialUserProfile(cred.user, username);
    return cred.user;
  } catch (e) {
    try {
      await cred.user.delete();
    } catch {}
    throw e;
  }
}

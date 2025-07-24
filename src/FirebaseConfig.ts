import { initializeApp, getApp, getApps } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getFirestore } from "@react-native-firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMx2jGfr3mslwuu7PXwRry8M72794NMek",
  authDomain: "calories-calculator-ai.firebaseapp.com",
  projectId: "calories-calculator-ai",
  storageBucket: "calories-calculator-ai.appspot.com",
  messagingSenderId: "516060318021",
  appId: "1:516060318021:web:f2413698c906624376d62c",
  measurementId: "G-QNQBTJVFEW",
};

let appPromise: Promise<any>;

if (!getApps().length) {
  appPromise = initializeApp(firebaseConfig);
} else {
  appPromise = Promise.resolve(getApp());
}

export const getFirebaseApp = () => appPromise;

export const getFirebaseAuth = async () => {
  const app = await appPromise;
  return getAuth(app);
};

export const getFirebaseFirestore = async () => {
  const app = await appPromise;
  return getFirestore(app);
};

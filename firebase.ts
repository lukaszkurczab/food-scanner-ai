import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyAMx2jGfr3mslwuu7PXwRry8M72794NMek",
  authDomain: "calories-calculator-ai.firebaseapp.com",
  projectId: "calories-calculator-ai",
  storageBucket: "calories-calculator-ai.firebasestorage.app",
  messagingSenderId: "516060318021",
  appId: "1:516060318021:web:f2413698c906624376d62c",
  measurementId: "G-QNQBTJVFEW",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { auth, db };

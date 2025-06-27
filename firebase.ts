import firebase from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMx2jGfr3mslwuu7PXwRry8M72794NMek",
  authDomain: "calories-calculator-ai.firebaseapp.com",
  projectId: "calories-calculator-ai",
  storageBucket: "calories-calculator-ai.appspot.com",
  messagingSenderId: "516060318021",
  appId: "1:516060318021:web:f2413698c906624376d62c",
  measurementId: "G-QNQBTJVFEW",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export { firebase, auth, firestore };

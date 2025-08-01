import { useState } from "react";
import { getFirebaseAuth, getFirebaseFirestore } from "@/src/FirebaseConfig";
import { doc, setDoc, collection } from "@react-native-firebase/firestore";
import { isUsernameAvailable } from "@/src/services/firestore/firestoreUserService";

type RegisterErrors = {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  general?: string;
};

export const useRegister = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isStrongPassword = (password: string) => {
    return (
      password.length >= 6 &&
      password.length <= 21 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  };

  const register = async (
    email: string,
    password: string,
    confirmPassword: string,
    username: string,
    termsAccepted: boolean
  ) => {
    const newErrors: RegisterErrors = {};

    if (!isValidEmail(email)) {
      newErrors.email = "invalidEmail";
    }

    if (!username.trim() || username.length < 3) {
      newErrors.username = "usernameTooShort";
    }

    if (!isStrongPassword(password)) {
      newErrors.password = "passwordTooWeak";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "passwordsDontMatch";
    }

    if (!termsAccepted) {
      newErrors.terms = "mustAcceptTerms";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const auth = await getFirebaseAuth();
      const firestore = await getFirebaseFirestore();

      const usernameUnique = await isUsernameAvailable(username);
      if (!usernameUnique) {
        setErrors({ username: "usernameTaken" });
        setLoading(false);
        return;
      }

      const userCredential = await auth.createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;
      const userUid = user.uid;

      const now = Date.now();

      const defaultUserProfile = {
        uid: userUid,
        email: user.email,
        username: username.trim(),
        createdAt: now,
        lastLogin: new Date().toISOString(),
        plan: "free",
        unitsSystem: "metric",
        age: "",
        sex: "",
        height: "",
        heightInch: null,
        weight: "",
        preferences: [],
        activityLevel: "",
        goal: "",
        calorieDeficit: null,
        calorieSurplus: null,
        chronicDiseases: [],
        chronicDiseasesOther: "",
        allergies: [],
        allergiesOther: "",
        lifestyle: "",
        aiStyle: "none",
        aiFocus: "none",
        aiFocusOther: "",
        aiNote: "",
        surveyComplited: false,
        syncState: "pending",
        lastSyncedAt: "",
        darkTheme: false,
        avatarUrl: "",
        avatarLocalPath: "",
        avatarlastSyncedAt: "",
      };

      const usersCol = collection(firestore, "users");
      const userDocRef = doc(usersCol, userUid);
      await setDoc(userDocRef, defaultUserProfile);

      const usernamesCol = collection(firestore, "usernames");
      const usernameDocRef = doc(usernamesCol, username.trim().toLowerCase());
      await setDoc(usernameDocRef, { uid: userUid, createdAt: now });
    } catch (error: any) {
      const errorMessage: RegisterErrors = {};

      if (error.code === "auth/email-already-in-use") {
        errorMessage.email = "emailInUse";
      } else if (error.code === "auth/invalid-email") {
        errorMessage.email = "invalidEmail";
      } else if (error.code === "auth/weak-password") {
        errorMessage.password = "passwordTooWeak";
      } else {
        errorMessage.general = "registrationFailed";
      }

      setErrors(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, errors };
};

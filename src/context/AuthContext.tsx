// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  type FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { attachQueues, disposeQueues } from "@/sync/queues";

type AuthContextType = {
  firebaseUser: FirebaseAuthTypes.User | null;
  uid: string | null;
  email: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setFirebaseUser: Dispatch<SetStateAction<FirebaseAuthTypes.User | null>>;
};

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  uid: null,
  email: null,
  isAuthenticated: false,
  loading: true,
  setFirebaseUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const app = getApp();
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextType>(() => {
    const uid = firebaseUser?.uid ?? null;
    const email = firebaseUser?.email ?? null;
    return {
      firebaseUser,
      uid,
      email,
      isAuthenticated: !!uid,
      loading,
      setFirebaseUser,
    };
  }, [firebaseUser, loading]);

  useEffect(() => {
    if (!value.uid) return;
    attachQueues(value.uid);
    return () => {
      if (value.uid) disposeQueues(value.uid);
    };
  }, [value.uid]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);

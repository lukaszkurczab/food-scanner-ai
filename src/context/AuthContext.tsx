import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  type FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import * as Sentry from "@sentry/react-native";

type AuthContextType = {
  firebaseUser: FirebaseAuthTypes.User | null;
  uid: string | null;
  email: string | null;
  isAuthenticated: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  uid: null,
  email: null,
  isAuthenticated: false,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setAuthStateUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const app = getApp();
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthStateUser(user);
      if (user) {
        Sentry.setUser({ id: user.uid });
      } else {
        Sentry.setUser(null);
      }
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
    };
  }, [firebaseUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);

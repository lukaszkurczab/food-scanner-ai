import { createContext, useContext, useEffect, useState } from "react";
import { getApp } from "@react-native-firebase/app";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const app = getApp();
    const auth = getAuth(app);

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);

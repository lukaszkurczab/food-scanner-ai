import { createContext, useContext, useEffect, useState } from "react";
import { useAuthContext } from "./AuthContext";
import { firestore } from "@/FirebaseConfig";

type UserData = {
  uid: string;
  email: string;
  [key: string]: any;
} | null;

type UserContextType = {
  userData: UserData;
  loadingUserData: boolean;
  refreshUserData: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  userData: null,
  loadingUserData: true,
  refreshUserData: () => Promise.resolve(),
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthContext();
  const [userData, setUserData] = useState<UserData>(null);
  const [loadingUserData, setLoadingUserData] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) {
      setUserData(null);
      setLoadingUserData(false);
      return;
    }

    try {
      const doc = await firestore().collection("users").doc(user.uid).get();
      setUserData({
        uid: doc.data()!.uid,
        email: doc.data()!.email!,
        username: doc.data()!.username,
        firstLogin: doc.data()!.firstLogin,
        createdAt: doc.data()!.createdAt,
        nutritionSurvey: doc.data()!.nutritionSurvey,
        ...doc.data(),
      });
    } catch (e) {
      console.error("Failed to fetch user data:", e);
      setUserData(null);
    } finally {
      setLoadingUserData(false);
    }
  };

  const refreshUserData = async () => {
    setLoadingUserData(true);
    await fetchUserData();
  };

  const updateUserDataLocally = async (data: Partial<UserData>) => {
    setUserData((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <UserContext.Provider
      value={{ userData, loadingUserData, refreshUserData }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);

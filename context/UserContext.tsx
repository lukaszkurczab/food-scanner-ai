import { createContext, useContext, useEffect, useState } from "react";
import { useAuthContext } from "./AuthContext";
import { firestore } from "@/FirebaseConfig";

type Meal = {
  id: string;
  name: string;
  date: string;
  ingredients: string[];
  nutrition: {
    kcal: number;
    carbs: number;
    fat: number;
    protein: number;
  };
};

type UserData = {
  uid: string;
  email: string;
  username: string;
  firstLogin: boolean;
  createdAt: string;
  nutritionSurvey?: any;
};

type UserContextType = {
  userData: UserData | null;
  loadingUserData: boolean;
  refreshUserData: () => Promise<void>;
  saveMealToFirestoreHistory: (meal: Meal) => Promise<void>;
  fetchUserHistory: () => Promise<Meal[]>;
};

const UserContext = createContext<UserContextType>({
  userData: null,
  loadingUserData: true,
  refreshUserData: () => Promise.resolve(),
  saveMealToFirestoreHistory: async () => {},
  fetchUserHistory: async () => [],
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthContext();
  const [userData, setUserData] = useState<UserData | null>(null);
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
      const data = doc.data();
      if (data) {
        setUserData({
          uid: user.uid,
          email: data.email,
          username: data.username,
          firstLogin: data.firstLogin,
          createdAt: data.createdAt,
          nutritionSurvey: data.nutritionSurvey,
        });
      }
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

  const saveMealToFirestoreHistory = async (meal: Meal) => {
    if (!user?.uid) return;
    try {
      await firestore()
        .collection("users")
        .doc(user.uid)
        .collection("history")
        .doc(meal.id)
        .set(meal);
    } catch (e) {
      console.error("Failed to save meal to history:", e);
      throw e;
    }
  };

  const fetchUserHistory = async (): Promise<Meal[]> => {
    if (!user?.uid) return [];

    try {
      const snapshot = await firestore()
        .collection("users")
        .doc(user.uid)
        .collection("history")
        .orderBy("date", "desc")
        .get();

      return snapshot.docs.map((doc) => doc.data() as Meal);
    } catch (e) {
      console.error("Failed to fetch user history:", e);
      return [];
    }
  };

  return (
    <UserContext.Provider
      value={{
        userData,
        loadingUserData,
        refreshUserData,
        saveMealToFirestoreHistory,
        fetchUserHistory,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);

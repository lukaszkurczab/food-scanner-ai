import { createContext, useContext, useEffect, useState } from "react";
import { useAuthContext } from "./AuthContext";
import { firestore } from "@/src/FirebaseConfig";

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
  myMeals?: Meal[];
  history?: Meal[];
};

type UserContextType = {
  userData: UserData | null;
  loadingUserData: boolean;
  refreshUserData: () => Promise<void>;
  saveMealToFirestoreHistory: (meal: Meal) => Promise<void>;
  saveMealToMyMeals: (meal: Meal) => Promise<void>;
  getMyMeals: () => Promise<Meal[]>;
  fetchUserHistory: () => Promise<Meal[]>;
};

const UserContext = createContext<UserContextType>({
  userData: null,
  loadingUserData: true,
  refreshUserData: () => Promise.resolve(),
  saveMealToFirestoreHistory: async () => {},
  saveMealToMyMeals: async () => {},
  getMyMeals: async () => [],
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
      const userDoc = await firestore().collection("users").doc(user.uid).get();
      const userDataRaw = userDoc.data();

      if (!userDataRaw) {
        setUserData(null);
        return;
      }

      const [myMealsSnap, historySnap] = await Promise.all([
        firestore()
          .collection("users")
          .doc(user.uid)
          .collection("myMeals")
          .orderBy("date", "desc")
          .get(),
        firestore()
          .collection("users")
          .doc(user.uid)
          .collection("history")
          .orderBy("date", "desc")
          .get(),
      ]);

      const myMeals: Meal[] = myMealsSnap.docs.map((doc) => doc.data() as Meal);
      const history: Meal[] = historySnap.docs.map((doc) => doc.data() as Meal);

      setUserData({
        uid: user.uid,
        email: userDataRaw.email,
        username: userDataRaw.username,
        firstLogin: userDataRaw.firstLogin,
        createdAt: userDataRaw.createdAt,
        nutritionSurvey: userDataRaw.nutritionSurvey,
        myMeals,
        history,
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

  const getMyMeals = async () => {
    if (!user?.uid) return [];

    try {
      const snapshot = await firestore()
        .collection("users")
        .doc(user.uid)
        .collection("myMeals")
        .orderBy("date", "desc")
        .get();

      return snapshot.docs.map((doc) => doc.data() as Meal);
    } catch (e) {
      console.error("Failed to fetch user history:", e);
      return [];
    }
  };

  const saveMealToMyMeals = async (meal: Meal) => {
    if (!user?.uid) return;
    try {
      await firestore()
        .collection("users")
        .doc(user.uid)
        .collection("myMeals")
        .doc(meal.id)
        .set(meal);

      setUserData((prev) =>
        prev
          ? {
              ...prev,
              myMeals: [
                meal,
                ...(prev.myMeals || []).filter((m) => m.id !== meal.id),
              ],
            }
          : prev
      );
    } catch (e) {
      console.error("Failed to save meal to myMeals:", e);
      throw e;
    }
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

      setUserData((prev) =>
        prev
          ? {
              ...prev,
              history: [
                meal,
                ...(prev.history || []).filter((m) => m.id !== meal.id),
              ],
            }
          : prev
      );
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
        saveMealToMyMeals,
        getMyMeals,
        fetchUserHistory,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);

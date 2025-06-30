import { useState } from "react";
import { firestore } from "@/firebase";
import { useUserContext } from "@/context/UserContext";
import { Meal } from "@/types";

export const useHistory = () => {
  const { userData } = useUserContext();
  const [loading, setLoading] = useState(false);
  const userId = userData?.uid;

  const saveMealToHistory = async (meal: Meal) => {
    if (!userId) return;
    setLoading(true);
    try {
      const userRef = firestore().collection("users").doc(userId);
      const userDoc = await userRef.get();
      const currentHistory: Meal[] = userDoc.data()?.mealHistory || [];

      const updatedHistory = [meal, ...currentHistory];
      await userRef.update({ mealHistory: updatedHistory });
    } catch (error) {
      console.error("Error saving meal:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearMealHistory = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await firestore().collection("users").doc(userId).update({
        mealHistory: [],
      });
    } catch (error) {
      console.error("Error clearing history:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeMealFromHistory = async (mealId: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const userRef = firestore().collection("users").doc(userId);
      const userDoc = await userRef.get();
      const currentHistory: Meal[] = userDoc.data()?.mealHistory || [];

      const updatedHistory = currentHistory.filter(
        (meal) => meal.id !== mealId
      );
      await userRef.update({ mealHistory: updatedHistory });
    } catch (error) {
      console.error("Error removing meal:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    saveMealToHistory,
    clearMealHistory,
    removeMealFromHistory,
    loading,
  };
};

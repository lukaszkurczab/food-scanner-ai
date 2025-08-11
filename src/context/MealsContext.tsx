import React, { createContext, useContext } from "react";
import { useAuthContext } from "./AuthContext";
import { useMeals as useMealsHook } from "@hooks/useMeals";
import type { Meal } from "@/types/meal";

export type MealsContextType = {
  meals: Meal[];
  loadingMeals: boolean;
  getMeals: () => Promise<void>;
  addMeal: (
    meal: Omit<Meal, "syncState" | "lastUpdated" | "source" | "updatedAt">
  ) => Promise<void>;
  updateMeal: (meal: Meal) => Promise<void>;
  deleteMeal: (mealCloudId: string) => Promise<void>;
  duplicateMeal: (original: Meal, dateOverride?: string) => Promise<void>;
  syncMeals: () => Promise<void>;
  getUnsyncedMeals: () => Promise<Meal[]>;
};

const MealsContext = createContext<MealsContextType>({
  meals: [],
  loadingMeals: true,
  getMeals: async () => {},
  addMeal: async () => {},
  updateMeal: async () => {},
  deleteMeal: async () => {},
  duplicateMeal: async () => {},
  syncMeals: async () => {},
  getUnsyncedMeals: async () => [],
});

export const MealsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthContext();
  const uid = user?.uid || "";

  const {
    meals,
    loading,
    getMeals,
    addMeal,
    updateMeal,
    deleteMeal,
    duplicateMeal,
    syncMeals,
    getUnsyncedMeals,
  } = useMealsHook(uid);

  return (
    <MealsContext.Provider
      value={{
        meals,
        loadingMeals: loading,
        getMeals,
        addMeal,
        updateMeal,
        deleteMeal,
        duplicateMeal,
        syncMeals,
        getUnsyncedMeals,
      }}
    >
      {children}
    </MealsContext.Provider>
  );
};

export const useMealsContext = () => useContext(MealsContext);

import React, { createContext, useContext, useMemo } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals as useMealsHook } from "@hooks/useMeals";
import type { Meal } from "@/types/meal";

export type MealsContextType = {
  meals: Meal[];
  loadingMeals: boolean;
  getMeals: () => Promise<void>;
  addMeal: (
    meal: Omit<Meal, "syncState" | "source" | "updatedAt">
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
  const { uid } = useAuthContext();
  const safeUid = uid ?? "";

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
  } = useMealsHook(safeUid);

  const value = useMemo<MealsContextType>(
    () => ({
      meals,
      loadingMeals: loading,
      getMeals,
      addMeal,
      updateMeal,
      deleteMeal,
      duplicateMeal,
      syncMeals,
      getUnsyncedMeals,
    }),
    [
      meals,
      loading,
      getMeals,
      addMeal,
      updateMeal,
      deleteMeal,
      duplicateMeal,
      syncMeals,
      getUnsyncedMeals,
    ]
  );

  return (
    <MealsContext.Provider value={value}>{children}</MealsContext.Provider>
  );
};

export const useMealsContext = () => useContext(MealsContext);

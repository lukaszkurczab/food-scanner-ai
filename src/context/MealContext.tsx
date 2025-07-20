import { createContext, useContext, useEffect, useState } from "react";
import { Ingredient } from "@/src/types";

type MealType = {
  id: string;
  image: string;
  ingredients: Ingredient[];
};

export type MealContextType = {
  meal: MealType[];
  addMeal: (meal: MealType) => void;
  removeMeal: (id: string) => void;
  clearMeal: () => void;
};

const MealContext = createContext<MealContextType>({
  meal: [],
  addMeal: () => {},
  removeMeal: () => {},
  clearMeal: () => {},
});

export const MealProvider = ({ children }: { children: React.ReactNode }) => {
  const [meal, setMeal] = useState<MealType[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      clearMeal();
    }, 20 * 60 * 1000);

    return () => clearTimeout(timeout);
  }, [meal]);

  const clearMeal = () => {
    setMeal([]);
  };

  const removeMeal = (id: string) => {
    setMeal((prevMeals) => prevMeals.filter((m) => m.id !== id));
  };

  const addMeal = (newMeal: MealType) => {
    const mealWithId: MealType = { ...newMeal };
    setMeal((prev) => [...prev, mealWithId]);
  };

  return (
    <MealContext.Provider
      value={{
        meal,
        addMeal,
        removeMeal,
        clearMeal,
      }}
    >
      {children}
    </MealContext.Provider>
  );
};

export const useMealContext = () => useContext(MealContext);

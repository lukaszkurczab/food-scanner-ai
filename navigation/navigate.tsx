import { createNavigationContainerRef } from "@react-navigation/native";
import { Ingredient, Meal, Nutrients } from "../types";

export type RootStackParamList = {
  Home: any;
  Camera:
    | {
        previousIngredients?: Ingredient[];
        previousNutrition?: Nutrients;
      }
    | undefined;
  Result: {
    image: string;
    previousIngredients: Ingredient[];
    previousNutrition: Nutrients;
  };
  History: undefined;
  MealDetail: { meal: Meal };
  Chat: undefined;
  Summary: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type ScreenNames = keyof RootStackParamList;

export function navigate(
  name: ScreenNames,
  params?: RootStackParamList[ScreenNames]
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function resetNavigation(
  name: ScreenNames,
  params?: RootStackParamList[ScreenNames]
) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name, params }],
    });
  }
}

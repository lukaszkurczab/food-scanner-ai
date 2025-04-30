import { createNavigationContainerRef } from "@react-navigation/native";
import { Meal } from "../types/index";

export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Result: { image: string } | any;
  History: undefined;
  MealDetail: { meal: Meal } | any;
  Chat: undefined;
  WeeklySummary: undefined;
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

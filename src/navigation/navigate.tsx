import { createNavigationContainerRef } from "@react-navigation/native";
import type { Meal } from "@/types";

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  CheckMailbox: { email: string };
  ChangeEmailCheckMailbox: { email: string };
  Onboarding: undefined;
  Profile: undefined;
  ResetPassword: undefined;
  Terms: undefined;
  IngredientsNotRecognized: { image: string; id: string; attempt?: number };
  AddMealManual: { id?: string; image?: string } | undefined;
  MealCamera:
    | { id?: string; attempt?: number; skipDetection?: boolean }
    | undefined;
  AddMealFromList: undefined;
  MealAddMethod: undefined;
  Statistics: undefined;
  Result: undefined;
  ReviewIngredients: undefined;
  Privacy: undefined;
  ManageSubscription: undefined;
  ChangePassword: undefined;
  SendFeedback: undefined;
  SelectSavedMeal: undefined;
  Language: undefined;
  UsernameChange: undefined;
  UserSettings: undefined;
  Register: undefined;
  SavedMeals: undefined;
  EditUserData: undefined;
  ChangeEmail: undefined;
  AvatarCamera: undefined;
  HistoryList: undefined;
  MealDetail: undefined;
  Chat: undefined;
  Summary: undefined;
  Loading: undefined;
  MealDetails: { meal: Meal };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type ScreenNames = keyof RootStackParamList;

export function navigate<Name extends ScreenNames>(
  name: Name,
  params?: RootStackParamList[Name]
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  }
}

export function resetNavigation<Name extends ScreenNames>(
  name: Name,
  params?: RootStackParamList[Name]
) {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name, params }] });
  }
}

import { createNavigationContainerRef } from "@react-navigation/native";
import { Meal } from "@/src/types";

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  CheckMailbox: {
    email: string;
  };
  ChangeEmailCheckMailbox: {
    email: string;
  };
  Onboarding: undefined;
  Profile: undefined;
  ResetPassword: undefined;
  Terms: undefined;
  IngredientsNotRecognized: {
    image: string;
    id: string;
    attempt?: number;
  };
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

export function navigate(
  name: ScreenNames,
  params?: RootStackParamList[ScreenNames]
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
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

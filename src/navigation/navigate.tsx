import { createNavigationContainerRef } from "@react-navigation/native";

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
  Privacy: undefined;
  ManageSubscription: undefined;
  ChangePassword: undefined;
  AddMealManual: { id?: string; image?: string } | undefined;
  SendFeedback: undefined;
  MealCamera:
    | { id?: string; attempt?: number; skipDetection?: boolean }
    | undefined;
  Language: undefined;
  AddMealFromList: undefined;
  UsernameChange: undefined;
  MealInputMethod: undefined;
  MealAddMethod: undefined;
  UserSettings: undefined;
  Register: undefined;
  SavedMeals: undefined;
  EditUserData: undefined;
  ChangeEmail: undefined;
  ReviewIngredients: undefined;
  AvatarCamera: undefined;
  Result: undefined;
  History: undefined;
  MealDetail: undefined;
  Chat: undefined;
  Summary: undefined;
  Loading: undefined;
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

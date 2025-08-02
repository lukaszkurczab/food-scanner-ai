import { createNavigationContainerRef } from "@react-navigation/native";

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  CheckMailbox: {
    email: string;
  };
  Onboarding: undefined;
  Profile: undefined;
  ResetPassword: undefined;
  Terms: undefined;
  Privacy: undefined;
  AddMealManual: undefined;
  AddMealFromList: undefined;
  UsernameChange: undefined;
  MealInputMethod: undefined;
  MealAddMethod: undefined;
  UserSettings: undefined;
  Register: undefined;
  SavedMeals: undefined;
  EditUserData: undefined;
  ChangeEmail: undefined;
  ReviewIngredients: {
    image: string;
    id: string;
  };
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

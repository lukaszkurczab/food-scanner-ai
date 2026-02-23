import { createNavigationContainerRef } from "@react-navigation/native";
import type { Meal } from "@/types";

export type RootStackParamList = {
  AddMeal:
    | {
        start?:
          | "MealCamera"
          | "BarcodeProductNotFound"
          | "IngredientsNotRecognized"
          | "ReviewIngredients"
          | "Result";
        barcodeOnly?: boolean;
        id?: string;
        skipDetection?: boolean;
        returnTo?:
          | "MealCamera"
          | "BarcodeProductNotFound"
          | "IngredientsNotRecognized"
          | "ReviewIngredients"
          | "Result";
        attempt?: number;
        code?: string;
        image?: string;
      }
    | undefined;

  Home: undefined;
  Login: undefined;
  CheckMailbox: { email: string };
  ChangeEmailCheckMailbox: { email: string };
  Onboarding: undefined;
  Profile: undefined;
  ResetPassword: undefined;
  Terms: undefined;
  AddMealManual: { id?: string; image?: string } | undefined;
  AddMealFromList: undefined;
  MealAddMethod: undefined;
  Statistics: undefined;
  EditReviewIngredients: { savedCloudId?: string } | undefined;
  EditResult: { savedCloudId?: string } | undefined;
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
  Notifications: undefined;
  NotificationForm: undefined;
  Loading: undefined;
  MealTextAI: undefined;
  MealDetails: { meal: Meal; edit?: boolean; baseline?: Meal };
  MealShare: { meal: Meal; returnTo: "Result" | "MealDetails" };
  SavedMealsCamera:
    | {
        id?: string;
        meal?: Meal;
      }
    | undefined;

  Result: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type ScreenNames = keyof RootStackParamList;

export function navigate<Name extends ScreenNames>(
  name: Name,
  params?: RootStackParamList[Name],
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  }
}

export function resetNavigation<Name extends ScreenNames>(
  name: Name,
  params?: RootStackParamList[Name],
) {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name, params }] });
  }
}

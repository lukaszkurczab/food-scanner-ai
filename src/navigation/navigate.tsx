import { createNavigationContainerRef, CommonActions } from "@react-navigation/native";
import type { Meal } from "@/types";

export type RootStackParamList = {
  AddMeal:
    | {
        start?:
          | "MealCamera"
          | "BarcodeProductNotFound"
          | "IngredientsNotRecognized"
          | "Result";
        barcodeOnly?: boolean;
        id?: string;
        skipDetection?: boolean;
        returnTo?:
          | "MealCamera"
          | "BarcodeProductNotFound"
          | "IngredientsNotRecognized"
          | "Result";
        attempt?: number;
        code?: string;
        image?: string;
        reason?: "not_recognized" | "ai_unavailable";
      }
    | undefined;

  Home: undefined;
  WeeklyReport: undefined;
  Login: undefined;
  CheckMailbox: { email: string };
  ChangeEmailCheckMailbox: { email: string };
  Onboarding: { mode?: "first" | "refill" } | undefined;
  Profile: undefined;
  ResetPassword: undefined;
  Terms: undefined;
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
  Register: undefined;
  SavedMeals: undefined;
  EditUserData: undefined;
  ChangeEmail: undefined;
  AvatarCamera: undefined;
  HistoryList: undefined;
  Chat: undefined;
  Notifications: undefined;
  NotificationForm: { id?: string | null } | undefined;
  Loading: undefined;
  MealTextAI: undefined;
  MealDetails: {
    meal: Meal;
    edit?: boolean;
    baseline?: Meal;
    localPhotoUrl?: string | null;
  };
  MealShare: { meal: Meal; returnTo: "Result" | "MealDetails" };
  SavedMealsCamera:
    | {
        id?: string;
        meal?: Meal;
      }
    | undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type ScreenNames = keyof RootStackParamList;
type ScreensWithOptionalParams = {
  [Name in ScreenNames]: undefined extends RootStackParamList[Name]
    ? Name
    : never;
}[ScreenNames];
type ScreensWithRequiredParams = Exclude<ScreenNames, ScreensWithOptionalParams>;

export function navigate<Name extends ScreensWithOptionalParams>(
  name: Name,
  params?: RootStackParamList[Name],
): void;
export function navigate<Name extends ScreensWithRequiredParams>(
  name: Name,
  params: RootStackParamList[Name],
): void;
export function navigate<Name extends ScreenNames>(
  name: Name,
  params?: RootStackParamList[Name],
): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: name as string,
        params,
      }),
    );
  }
}

export function resetNavigation<Name extends ScreensWithOptionalParams>(
  name: Name,
  params?: RootStackParamList[Name],
): void;
export function resetNavigation<Name extends ScreensWithRequiredParams>(
  name: Name,
  params: RootStackParamList[Name],
): void;
export function resetNavigation<Name extends ScreenNames>(
  name: Name,
  params?: RootStackParamList[Name],
): void {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name, params }] });
  }
}

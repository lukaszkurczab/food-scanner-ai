import { Meal } from "./index";

export type RootStackParamList = {
  AuthLoadingScreen: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Camera: undefined;
  Result: { image: string };
  History: undefined;
  MealDetail: { meal: Meal };
  Chat: undefined;
  Summary: undefined;
};

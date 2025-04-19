import { Meal } from './index';

export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Result: { image: string };
  History: undefined;
  MealDetail: { meal: Meal };
  Chat: undefined;
  WeeklySummary: undefined;
};
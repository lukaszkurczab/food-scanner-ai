import { Ingredient } from './ingredient';
import { Nutrients } from './nutrients';

export type Meal = {
  id: string;
  name: string;
  date: string;
  ingredients: Ingredient[];
  nutrition: Nutrients;
};

export type MealHistory = {
  id: string;
  name: string;
  date: string;
  ingredients: string[];
  nutrition: Nutrients;
};

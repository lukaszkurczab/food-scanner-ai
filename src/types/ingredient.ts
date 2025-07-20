export type Ingredient = {
  name: string;
  amount: number;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  type: 'food' | 'drink';
  fromTable: boolean;
};

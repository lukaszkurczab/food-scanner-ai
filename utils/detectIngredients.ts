import { Ingredient } from "../types/common";

export async function mockDetectIngredients(
  imageUri: string
): Promise<Ingredient[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { name: "Chicken", amount: 150 },
        { name: "Rise", amount: 100 },
        { name: "Brocule", amount: 80 },
      ]);
    }, 1000); 
  });
}

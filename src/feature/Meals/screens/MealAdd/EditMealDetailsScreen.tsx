import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { MealDetailsFormScreen } from "./MealDetailsFormScreen";

export default function EditMealDetailsScreen({
  navigation,
  flow,
}: MealAddScreenProps<"EditMealDetails">) {
  return <MealDetailsFormScreen navigation={navigation} flow={flow} mode="review" />;
}

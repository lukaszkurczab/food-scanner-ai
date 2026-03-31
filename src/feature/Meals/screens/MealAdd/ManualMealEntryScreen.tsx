import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { MealDetailsFormScreen } from "./MealDetailsFormScreen";

export default function ManualMealEntryScreen({
  navigation,
  flow,
}: MealAddScreenProps<"ManualMealEntry">) {
  return <MealDetailsFormScreen navigation={navigation} flow={flow} mode="manual" />;
}

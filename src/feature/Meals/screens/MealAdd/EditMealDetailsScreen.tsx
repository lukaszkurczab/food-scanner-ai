import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { MealDetailsFormScreen } from "./MealDetailsFormScreen";

export default function EditMealDetailsScreen({
  navigation,
  flow,
}: MealAddScreenProps<"EditMealDetails">) {
  const { meal } = useMealDraftContext();
  const reviewPhotoUri =
    meal?.localPhotoUrl ?? meal?.photoLocalPath ?? meal?.photoUrl ?? null;

  return (
    <MealDetailsFormScreen
      navigation={navigation}
      flow={flow}
      mode="review"
      reviewPhotoUri={reviewPhotoUri}
      onReviewPhotoPress={() => {
        if (!meal?.mealId) return;
        flow.goTo("CameraDefault", {
          id: meal.mealId,
          skipDetection: true,
        });
      }}
    />
  );
}

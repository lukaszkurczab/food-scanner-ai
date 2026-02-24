import React from "react";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import ReviewIngredientsEditor from "@/components/ReviewIngredientsEditor";
import type { MealAddScreenProps } from "../../feature/MapMealAddScreens";

export default function ReviewIngredientsScreen({
  navigation,
  flow,
}: MealAddScreenProps<"ReviewIngredients">) {
  const { clearMeal } = useMealDraftContext();
  const { uid } = useAuthContext();

  const handleStartOver = React.useCallback(() => {
    if (uid) clearMeal(uid);
    navigation.replace("MealAddMethod");
  }, [clearMeal, navigation, uid]);

  return (
    <ReviewIngredientsEditor
      screenTrackingName="AddMeal"
      onContinue={() => flow.goTo("Result")}
      onOpenCamera={() =>
        flow.goTo("MealCamera", {
          skipDetection: true,
          returnTo: "ReviewIngredients",
        })
      }
      onStartOver={handleStartOver}
      addIngredientButtonVariant="primary"
      hideAddIngredientWhileEditing
      validateLocalImageFile
    />
  );
}

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals } from "@/hooks/useMeals";
import type { RootStackParamList } from "@/navigation/navigate";
import { MealDetailsFormScreen } from "@/feature/Meals/screens/MealAdd/MealDetailsFormScreen";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import type { MealAddFlowApi } from "@/feature/Meals/feature/MapMealAddScreens";
import type { Meal } from "@/types/meal";
import { pickMealPhotoUri } from "@/utils/mealImage";

type EditHistoryMealDetailsNavigation = StackNavigationProp<
  RootStackParamList,
  "EditHistoryMealDetails"
>;
type EditHistoryMealDetailsRoute = RouteProp<
  RootStackParamList,
  "EditHistoryMealDetails"
>;

export default function EditHistoryMealDetailsScreen({
  navigation,
}: {
  navigation: EditHistoryMealDetailsNavigation;
}) {
  const route = useRoute<EditHistoryMealDetailsRoute>();
  const { t } = useTranslation(["common", "meals"]);
  const { uid } = useAuthContext();
  const { updateMeal } = useMeals(uid || "");
  const { meal, saveDraft, setLastScreen, setMeal } = useMealDraftContext();
  const seededMealVersionRef = useRef<string | null>(null);

  useEffect(() => {
    const nextMeal = route.params.meal;
    const nextMealVersion = [
      nextMeal.cloudId ?? "",
      nextMeal.mealId ?? "",
      nextMeal.updatedAt ?? "",
    ].join("|");
    if (seededMealVersionRef.current === nextMealVersion) {
      return;
    }
    seededMealVersionRef.current = nextMealVersion;

    setMeal(nextMeal);
    if (!uid) return;
    void saveDraft(uid, nextMeal);
    void setLastScreen(uid, "EditMealDetails");
  }, [route.params.meal, saveDraft, setLastScreen, setMeal, uid]);

  const flow = useMemo<MealAddFlowApi>(
    () => ({
      goTo: () => {},
      replace: () => {},
      goBack: () => {
        navigation.goBack();
      },
      canGoBack: () => true,
    }),
    [navigation],
  );

  const handleReviewSubmit = useCallback(
    async (meal: Meal) => {
      await updateMeal({ ...meal, localPhotoUrl: undefined });
      navigation.goBack();
    },
    [navigation, updateMeal],
  );

  const reviewPhotoUri = pickMealPhotoUri(meal);

  return (
    <MealDetailsFormScreen
      navigation={navigation}
      flow={flow}
      mode="review"
      onReviewSubmit={handleReviewSubmit}
      reviewSubmitLabel={t("save_changes", {
        ns: "common",
        defaultValue: "Save changes",
      })}
      reviewFallbackLabel={t("back", {
        ns: "common",
        defaultValue: "Back",
      })}
      onReviewFallback={() => {
        navigation.goBack();
      }}
      reviewPhotoUri={reviewPhotoUri}
      reviewPhotoActionLabel={t("add_photo", {
        ns: "meals",
        defaultValue: "Add photo",
      })}
      onReviewPhotoPress={() => {
        const currentMeal = meal ?? route.params.meal;
        if (!currentMeal) return;
        navigation.replace("SavedMealsCamera", {
          id: currentMeal.mealId,
          meal: currentMeal,
          returnTo: "EditHistoryMealDetails",
        });
      }}
    />
  );
}

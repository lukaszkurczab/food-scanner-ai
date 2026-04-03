import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNetInfo } from "@react-native-community/netinfo";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals } from "@/hooks/useMeals";
import type { RootStackParamList } from "@/navigation/navigate";
import { useMealDetailsState } from "@/feature/History/hooks/useMealDetailsState";
import { deleteSavedMeal } from "@/feature/History/services/savedMealsService";
import { useMealDraftContext } from "@contexts/MealDraftContext";

type ScreenRoute = RouteProp<RootStackParamList, "MealDetails">;
type MealDetailsNavigation = StackNavigationProp<RootStackParamList>;

export function useMealDetailsScreenState() {
  const route = useRoute<ScreenRoute>();
  const navigation = useNavigation<MealDetailsNavigation>();
  const { uid } = useAuthContext();
  const netInfo = useNetInfo();
  const { deleteMeal } = useMeals(uid || "");
  const { saveDraft, setLastScreen, setMeal } = useMealDraftContext();

  return useMealDetailsState({
    routeParams: route.params,
    navigation,
    deleteMeal,
    uid: uid || "",
    saveDraft,
    setLastScreen,
    setMeal,
    deleteSavedMeal: async (cloudId: string) => {
      if (!uid) return;
      await deleteSavedMeal({
        uid,
        cloudId,
        isOnline: netInfo.isConnected !== false,
      });
    },
  });
}

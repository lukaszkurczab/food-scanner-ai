import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals } from "@/hooks/useMeals";
import type { RootStackParamList } from "@/navigation/navigate";
import { useMealDetailsState } from "@/feature/History/hooks/useMealDetailsState";

type ScreenRoute = RouteProp<RootStackParamList, "MealDetails">;
type MealDetailsNavigation = StackNavigationProp<RootStackParamList>;

export function useMealDetailsScreenState() {
  const route = useRoute<ScreenRoute>();
  const navigation = useNavigation<MealDetailsNavigation>();
  const { uid } = useAuthContext();
  const { deleteMeal } = useMeals(uid || "");

  return useMealDetailsState({
    routeParams: route.params,
    navigation,
    deleteMeal,
    uid: uid || "",
  });
}

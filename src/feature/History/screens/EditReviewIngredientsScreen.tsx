import React, { useMemo } from "react";
import {
  useNavigation,
  useRoute,
  RouteProp,
  type ParamListBase,
} from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import ReviewIngredientsEditor from "@/feature/Meals/components/ReviewIngredientsEditor";
import type { RootStackParamList } from "@/navigation/navigate";

type ScreenRoute = RouteProp<RootStackParamList, "EditReviewIngredients">;

export default function EditReviewIngredientsScreen() {
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route = useRoute<ScreenRoute>();
  const savedCloudId = route.params?.savedCloudId;
  const { t } = useTranslation(["meals", "common"]);
  const { clearMeal } = useMealDraftContext();
  const { uid } = useAuthContext();

  const textOverrides = useMemo(
    () => ({
      startOverButtonLabel: t("back_to_saved", {
        ns: "meals",
        defaultValue: "Wróć do zapisanych",
      }),
      startOverTitle: t("leave_edit_title", {
        ns: "meals",
        defaultValue: "Zakończyć edycję?",
      }),
      startOverMessage: t("leave_edit_message", {
        ns: "meals",
        defaultValue: "Porzucić zmiany i wrócić do zapisanych posiłków?",
      }),
      startOverPrimaryLabel: t("back_to_saved", {
        ns: "meals",
        defaultValue: "Wróć do zapisanych",
      }),
      startOverSecondaryLabel: t("continue_editing", {
        ns: "meals",
        defaultValue: "Kontynuuj edycję",
      }),
      exitTitle: t("confirm_exit_title", {
        ns: "meals",
        defaultValue: "Wyjść z edycji?",
      }),
      exitMessage: t("confirm_exit_message", {
        ns: "meals",
        defaultValue: "Masz niezapisane zmiany. Na pewno wyjść?",
      }),
      exitPrimaryLabel: t("leave", {
        ns: "common",
        defaultValue: "Wyjdź",
      }),
      exitSecondaryLabel: t("continue", { ns: "common" }),
    }),
    [t]
  );

  return (
    <ReviewIngredientsEditor
      screenTrackingName="EditReviewIngredients"
      onContinue={() =>
        navigation.navigate(
          "EditResult",
          savedCloudId ? { savedCloudId } : undefined
        )
      }
      onOpenCamera={() =>
        navigation.replace("MealCamera", {
          returnTo: "IngredientsNotRecognized",
          skipDetection: true,
        })
      }
      onStartOver={() => {
        if (uid) clearMeal(uid);
        navigation.replace("SavedMeals");
      }}
      addIngredientButtonVariant="secondary"
      disableAddIngredientWhileEditing
      containerPadding
      enableBeforeRemoveGuard
      navigation={navigation}
      continueAllowLeaveResetMs={300}
      textOverrides={textOverrides}
    />
  );
}

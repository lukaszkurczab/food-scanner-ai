import { useCallback, useEffect, useState } from "react";
import * as FileSystem from "expo-file-system";
import type { ParamListBase } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { Meal, MealType } from "@/types/meal";
import { autoMealName } from "@/utils/autoMealName";
import { updateSavedMeal } from "@/feature/History/services/savedMealsService";

type EditResultNavigation = StackNavigationProp<ParamListBase>;

export function useEditResultState(params: {
  uid: string | null;
  meal: Meal | null;
  savedCloudId?: string;
  setLastScreen: (userUid: string, screen: string) => Promise<void>;
  setPhotoUrl: (url: string | null) => void;
  navigation: EditResultNavigation;
}) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAt, setSelectedAt] = useState<Date>(
    params.meal?.timestamp ? new Date(params.meal.timestamp) : new Date(),
  );
  const [addedAt, setAddedAt] = useState<Date>(new Date());
  const [imageError, setImageError] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);

  const image = params.meal?.photoUrl ?? null;
  const mealName = params.meal?.name || autoMealName();
  const mealType: MealType = params.meal?.type || "breakfast";

  useEffect(() => {
    setImageError(false);
  }, [image]);

  useEffect(() => {
    if (!params.uid) return;
    void params.setLastScreen(params.uid, "EditResult");
  }, [params.setLastScreen, params.uid]);

  useEffect(() => {
    const checkLocalImage = async () => {
      const photoUrl = params.meal?.photoUrl;
      if (!photoUrl) return;

      setCheckingImage(true);
      try {
        const isLocal = photoUrl.startsWith("file://");
        if (!isLocal) {
          params.setPhotoUrl(null);
          return;
        }

        const info = await FileSystem.getInfoAsync(photoUrl);
        if (!info.exists) {
          params.setPhotoUrl(null);
        }
      } finally {
        setCheckingImage(false);
      }
    };

    void checkLocalImage();
  }, [params.meal?.photoUrl, params.setPhotoUrl]);

  const goShare = useCallback(() => {
    if (!params.meal) return;

    params.navigation.navigate("MealShare", {
      meal: {
        ...params.meal,
        name: mealName,
        type: mealType,
        timestamp: selectedAt.toISOString(),
      },
      returnTo: "MealDetails",
    });
  }, [mealName, mealType, params.meal, params.navigation, selectedAt]);

  const handleAddPhoto = useCallback(() => {
    params.navigation.navigate("MealCamera", {
      skipDetection: true,
      returnTo: "EditResult",
    });
  }, [params.navigation]);

  const handleSave = useCallback(async () => {
    if (!params.uid || !params.meal || saving || !params.savedCloudId) return;

    setSaving(true);
    try {
      await updateSavedMeal({
        uid: params.uid,
        cloudId: params.savedCloudId,
        meal: params.meal,
        name: mealName,
        type: mealType,
        timestampISO: selectedAt.toISOString(),
        createdAtISO: addedAt.toISOString(),
      });

      params.navigation.navigate("SavedMeals");
    } finally {
      setSaving(false);
    }
  }, [
    addedAt,
    mealName,
    mealType,
    params.meal,
    params.navigation,
    params.savedCloudId,
    params.uid,
    saving,
    selectedAt,
  ]);

  const handleCancel = useCallback(() => {
    setShowCancelModal(true);
  }, []);

  const handleCancelConfirm = useCallback(() => {
    params.navigation.navigate("SavedMeals");
  }, [params.navigation]);

  const closeCancelModal = useCallback(() => {
    setShowCancelModal(false);
  }, []);

  const toggleIngredients = useCallback(() => {
    if (saving) return;
    setShowIngredients((prev) => !prev);
  }, [saving]);

  const onImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return {
    ready: !!params.meal && !!params.uid,
    mealName,
    image,
    imageError,
    checkingImage,
    showIngredients,
    saving,
    selectedAt,
    addedAt,
    showCancelModal,
    canSave: !saving && !!params.savedCloudId,
    setSelectedAt,
    setAddedAt,
    goShare,
    handleAddPhoto,
    handleSave,
    handleCancel,
    handleCancelConfirm,
    closeCancelModal,
    toggleIngredients,
    onImageError,
  };
}

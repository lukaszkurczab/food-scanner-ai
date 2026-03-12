import { useCallback, useEffect, useState } from "react";
import * as FileSystem from "expo-file-system";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { Meal, MealType } from "@/types/meal";
import { autoMealName } from "@/utils/autoMealName";
import { updateSavedMeal } from "@/feature/History/services/savedMealsService";
import type { RootStackParamList } from "@/navigation/navigate";
import { getMyMealByCloudIdLocal } from "@/services/offline/myMeals.repo";
import { getMealByCloudIdLocal } from "@/services/offline/meals.repo";

type EditResultNavigation = StackNavigationProp<RootStackParamList, "EditResult">;

export function useEditResultState(params: {
  uid: string | null;
  meal: Meal | null;
  savedCloudId?: string;
  setLastScreen: (userUid: string, screen: string) => Promise<void>;
  setPhotoUrl: (url: string | null) => void;
  navigation: EditResultNavigation;
}) {
  const { uid, meal, savedCloudId, setLastScreen, setPhotoUrl, navigation } = params;
  const [localMeal, setLocalMeal] = useState<Meal | null>(meal);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAt, setSelectedAt] = useState<Date>(
    meal?.timestamp ? new Date(meal.timestamp) : new Date(),
  );
  const [addedAt, setAddedAt] = useState<Date>(new Date());
  const [imageError, setImageError] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);
  const currentMeal = meal ?? localMeal;

  const image = currentMeal?.photoLocalPath ?? currentMeal?.photoUrl ?? null;
  const mealName = currentMeal?.name || autoMealName();
  const mealType: MealType = currentMeal?.type || "breakfast";

  useEffect(() => {
    setImageError(false);
  }, [image]);

  useEffect(() => {
    if (!uid) return;
    void setLastScreen(uid, "EditResult");
  }, [setLastScreen, uid]);

  const reloadFromLocal = useCallback(async () => {
    if (!uid || !savedCloudId) return false;
    const [saved, history] = await Promise.all([
      getMyMealByCloudIdLocal(uid, savedCloudId),
      getMealByCloudIdLocal(uid, savedCloudId),
    ]);
    const resolved = saved ?? history;
    if (!resolved) return false;
    setLocalMeal(resolved);
    return true;
  }, [savedCloudId, uid]);

  useEffect(() => {
    if (meal) {
      setLocalMeal(meal);
      return;
    }
    void reloadFromLocal();
  }, [meal, reloadFromLocal]);

  useEffect(() => {
    const checkLocalImage = async () => {
      const photoUrl = currentMeal?.photoLocalPath ?? currentMeal?.photoUrl;
      if (!photoUrl) return;

      setCheckingImage(true);
      try {
        const isLocal = photoUrl.startsWith("file://");
        if (!isLocal) {
          setPhotoUrl(null);
          return;
        }

        const info = await FileSystem.getInfoAsync(photoUrl);
        if (!info.exists) {
          setPhotoUrl(null);
        }
      } finally {
        setCheckingImage(false);
      }
    };

    void checkLocalImage();
  }, [currentMeal?.photoLocalPath, currentMeal?.photoUrl, setPhotoUrl]);

  const goShare = useCallback(() => {
    if (!currentMeal) return;

    navigation.navigate("MealShare", {
      meal: {
        ...currentMeal,
        name: mealName,
        type: mealType,
        timestamp: selectedAt.toISOString(),
      },
      returnTo: "MealDetails",
    });
  }, [currentMeal, mealName, mealType, navigation, selectedAt]);

  const handleAddPhoto = useCallback(() => {
    if (!currentMeal) return;
    navigation.navigate("SavedMealsCamera", {
      id: currentMeal.mealId,
      meal: currentMeal,
    });
  }, [currentMeal, navigation]);

  const handleSave = useCallback(async () => {
    if (!uid || !currentMeal || saving || !savedCloudId) return;

    setSaving(true);
    try {
      await updateSavedMeal({
        uid,
        cloudId: savedCloudId,
        meal: currentMeal,
        name: mealName,
        type: mealType,
        timestampISO: selectedAt.toISOString(),
        createdAtISO: addedAt.toISOString(),
      });

      navigation.navigate("SavedMeals");
    } finally {
      setSaving(false);
    }
  }, [
    addedAt,
    mealName,
    mealType,
    currentMeal,
    navigation,
    savedCloudId,
    uid,
    saving,
    selectedAt,
  ]);

  const handleCancel = useCallback(() => {
    setShowCancelModal(true);
  }, []);

  const handleCancelConfirm = useCallback(() => {
    navigation.navigate("SavedMeals");
  }, [navigation]);

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
    ready: !!currentMeal && !!uid,
    meal: currentMeal,
    mealName,
    image,
    imageError,
    checkingImage,
    showIngredients,
    saving,
    selectedAt,
    addedAt,
    showCancelModal,
    canSave: !saving && !!savedCloudId,
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
    reloadFromLocal,
  };
}

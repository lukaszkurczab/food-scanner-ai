import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler } from "react-native";
import * as FileSystem from "@/services/core/fileSystem";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import type { Meal } from "@/types/meal";
import type { RootStackParamList } from "@/navigation/navigate";
import type { StackNavigationProp } from "@react-navigation/stack";
import { emit } from "@/services/core/events";
import {
  selectLocalMealByCloudId,
  subscribeLocalMeals,
} from "@/services/meals/localMealsStore";

function buildEditDraft(meal: Meal): Meal {
  return {
    ...meal,
    localPhotoUrl:
      meal.localPhotoUrl ?? meal.photoLocalPath ?? meal.photoUrl ?? null,
    photoLocalPath:
      meal.photoLocalPath ?? meal.localPhotoUrl ?? meal.photoUrl ?? null,
  };
}

export function useMealDetailsState(params: {
  routeParams: RootStackParamList["MealDetails"];
  navigation: StackNavigationProp<RootStackParamList>;
  uid: string;
  saveDraft: (userUid: string, draftOverride?: Meal | null) => Promise<void>;
  setLastScreen: (userUid: string, screen: string) => Promise<void>;
  setMeal: (meal: Meal) => void;
  deleteMeal: (mealCloudId: string) => Promise<unknown>;
}) {
  const {
    routeParams,
    navigation,
    uid,
    saveDraft,
    setLastScreen,
    setMeal,
    deleteMeal,
  } = params;
  const initialMeal = routeParams.meal;
  const routeMealId = initialMeal?.cloudId ?? initialMeal?.mealId ?? null;

  const [draft, setDraft] = useState<Meal | null>(() => initialMeal ?? null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const allowNextBackRef = useRef(false);
  const deletedRef = useRef(false);
  const routeMealIdRef = useRef(routeMealId);

  useEffect(() => {
    if (routeMealIdRef.current === routeMealId) return;
    routeMealIdRef.current = routeMealId;
    deletedRef.current = false;
    setDraft(initialMeal ?? null);
  }, [initialMeal, routeMealId]);

  const reloadFromLocal = useCallback(async () => {
    if (deletedRef.current) return false;
    if (!routeMealId) return false;
    const userUid =
      (typeof draft?.userUid === "string" && draft.userUid) ||
      (typeof initialMeal?.userUid === "string" && initialMeal.userUid) ||
      "";
    if (!userUid) return false;

    const localMeal = selectLocalMealByCloudId(userUid, routeMealId);
    if (!localMeal) {
      setDraft(null);
      return false;
    }

    setDraft((current) => ({
      ...localMeal,
      localPhotoUrl:
        current?.localPhotoUrl ??
        localMeal.localPhotoUrl ??
        localMeal.photoLocalPath ??
        localMeal.photoUrl ??
        null,
    }));
    return true;
  }, [draft?.userUid, initialMeal?.userUid, routeMealId]);

  useEffect(() => {
    if (!routeMealId) return;
    const userUid =
      (typeof draft?.userUid === "string" && draft.userUid) ||
      (typeof initialMeal?.userUid === "string" && initialMeal.userUid) ||
      "";
    if (!userUid) return;

    void reloadFromLocal();

    let cancelled = false;
    const unsubscribe = subscribeLocalMeals(userUid, () => {
      if (!cancelled) void reloadFromLocal();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [draft?.userUid, initialMeal?.userUid, reloadFromLocal, routeMealId]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigation.canGoBack()) {
        allowNextBackRef.current = true;
        navigation.goBack();
      } else {
        navigation.navigate("HistoryList");
      }
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", () => {
      if (allowNextBackRef.current) {
        allowNextBackRef.current = false;
      }
    });

    return sub;
  }, [navigation]);

  const effectivePhotoUri =
    draft?.localPhotoUrl || draft?.photoLocalPath || draft?.photoUrl || "";

  useEffect(() => {
    const url = effectivePhotoUri;
    if (!url) return;
    const isLocal =
      typeof url === "string" &&
      (url.startsWith("file://") || url.startsWith("content://"));
    if (!isLocal) return;

    let cancelled = false;
    setCheckingImage(true);
    FileSystem.getInfoAsync(url)
      .then((info) => {
        if (cancelled || info.exists) return;
        setDraft((current) =>
          current
            ? {
                ...current,
                localPhotoUrl: null,
                photoLocalPath: null,
                photoUrl: "",
              }
            : current,
        );
      })
      .finally(() => {
        if (!cancelled) setCheckingImage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectivePhotoUri]);

  const nutrition = useMemo(
    () => (draft ? calculateTotalNutrients([draft]) : null),
    [draft],
  );

  const startEdit = useCallback(async () => {
    if (!draft || !uid) return;
    const nextDraft = buildEditDraft(draft);
    setMeal(nextDraft);
    await saveDraft(uid, nextDraft);
    await setLastScreen(uid, "EditMealDetails");
    navigation.navigate("EditHistoryMealDetails", { meal: nextDraft });
  }, [draft, navigation, saveDraft, setLastScreen, setMeal, uid]);

  const goShare = useCallback(() => {
    if (!draft) return;
    const photoUri =
      draft.localPhotoUrl || draft.photoLocalPath || draft.photoUrl || "";
    const hasIdentity = Boolean(draft.cloudId || draft.mealId);
    if (!hasIdentity || !photoUri) return;
    navigation.navigate("MealShare", { meal: draft, returnTo: "MealDetails" });
  }, [draft, navigation]);

  const onImageError = useCallback(() => {
    setDraft((current) =>
      current
        ? {
            ...current,
            localPhotoUrl: null,
            photoLocalPath: null,
            photoUrl: "",
          }
        : current,
    );
  }, []);

  const openDeleteModal = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (deleting) return;
    setShowDeleteModal(false);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    if (!draft || deleting) return;
    const fallbackId = draft.cloudId || draft.mealId || "";
    if (!fallbackId) return;

    setDeleting(true);
    try {
      const userUid =
        (typeof draft.userUid === "string" && draft.userUid) ||
        (typeof initialMeal?.userUid === "string" && initialMeal.userUid) ||
        uid ||
        "";
      const historyMeal = userUid
        ? selectLocalMealByCloudId(userUid, fallbackId)
        : null;
      const historyMealId = historyMeal?.cloudId || historyMeal?.mealId || "";
      const deleteId = historyMealId || fallbackId;
      if (!deleteId) return;

      await deleteMeal(deleteId);

      deletedRef.current = true;
      setShowDeleteModal(false);
      setDraft(null);

      if (navigation.canGoBack()) {
        allowNextBackRef.current = true;
        navigation.goBack();
      } else {
        navigation.navigate("HistoryList");
      }
    } catch {
      emit("ui:toast", { key: "unknownError", ns: "common" });
    } finally {
      setDeleting(false);
    }
  }, [
    deleteMeal,
    deleting,
    draft,
    initialMeal?.userUid,
    navigation,
    uid,
  ]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      allowNextBackRef.current = true;
      navigation.goBack();
    } else {
      navigation.navigate("HistoryList");
    }
  }, [navigation]);

  return {
    draft,
    showDeleteModal,
    checkingImage,
    deleting,
    effectivePhotoUri,
    nutrition,
    startEdit,
    goShare,
    onImageError,
    openDeleteModal,
    closeDeleteModal,
    confirmDelete,
    handleBack,
    reloadFromLocal,
    showImageBlock: checkingImage || !!effectivePhotoUri,
  };
}

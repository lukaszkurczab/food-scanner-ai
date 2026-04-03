import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler } from "react-native";
import * as FileSystem from "expo-file-system";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import type { Meal } from "@/types/meal";
import type { RootStackParamList } from "@/navigation/navigate";
import type { StackNavigationProp } from "@react-navigation/stack";
import { on } from "@/services/core/events";
import { getMealByCloudIdLocal } from "@/services/offline/meals.repo";
import { getMyMealByCloudIdLocal } from "@/services/offline/myMeals.repo";

function toEpochMs(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickLatestMeal(candidates: Array<Meal | null>): Meal | null {
  let latest: Meal | null = null;
  let latestTs = 0;
  for (const candidate of candidates) {
    if (!candidate) continue;
    const ts = toEpochMs(candidate.updatedAt);
    if (!latest || ts >= latestTs) {
      latest = candidate;
      latestTs = ts;
    }
  }
  return latest;
}

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
  deleteSavedMeal: (cloudId: string) => Promise<unknown>;
}) {
  const {
    routeParams,
    navigation,
    uid,
    saveDraft,
    setLastScreen,
    setMeal,
    deleteMeal,
    deleteSavedMeal,
  } = params;
  const initialMeal = routeParams.meal;
  const routeMealId = initialMeal?.cloudId ?? initialMeal?.mealId ?? null;

  const [draft, setDraft] = useState<Meal | null>(() => initialMeal ?? null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const allowNextBackRef = useRef(false);

  useEffect(() => {
    if (!routeMealId) return;
    const currentId = draft?.cloudId ?? draft?.mealId ?? null;
    if (currentId !== routeMealId) {
      setDraft(initialMeal ?? null);
    }
  }, [draft?.cloudId, draft?.mealId, initialMeal, routeMealId]);

  const reloadFromLocal = useCallback(async () => {
    if (!routeMealId) return false;
    const userUid =
      (typeof draft?.userUid === "string" && draft.userUid) ||
      (typeof initialMeal?.userUid === "string" && initialMeal.userUid) ||
      "";
    if (!userUid) return false;

    const [historyMeal, savedMeal] = await Promise.all([
      getMealByCloudIdLocal(userUid, routeMealId),
      getMyMealByCloudIdLocal(userUid, routeMealId),
    ]);
    const latest = pickLatestMeal([historyMeal, savedMeal]);
    if (!latest) return false;

    setDraft((current) => ({
      ...latest,
      localPhotoUrl:
        current?.localPhotoUrl ??
        latest.localPhotoUrl ??
        latest.photoLocalPath ??
        latest.photoUrl ??
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

    let cancelled = false;
    void reloadFromLocal();

    const handleSyncEvent = (event?: { cloudId?: string }) => {
      const cloudId = typeof event?.cloudId === "string" ? event.cloudId : "";
      if (!cloudId || cloudId !== routeMealId || cancelled) return;
      void reloadFromLocal();
    };

    const unsubs = [
      on<{ cloudId?: string }>("meal:local:upserted", handleSyncEvent),
      on<{ cloudId?: string }>("mymeal:local:upserted", handleSyncEvent),
    ];

    return () => {
      cancelled = true;
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [draft?.userUid, initialMeal?.userUid, reloadFromLocal, routeMealId]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigation.canGoBack()) {
        allowNextBackRef.current = true;
        navigation.goBack();
      } else {
        navigation.navigate("SavedMeals");
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
    const id = draft?.cloudId || draft?.mealId || "";
    if (!draft || !id || deleting) return;

    setDeleting(true);
    try {
      if (draft.source === "saved") {
        await deleteSavedMeal(id);
      } else {
        await deleteMeal(id);
      }

      setShowDeleteModal(false);

      if (navigation.canGoBack()) {
        allowNextBackRef.current = true;
        navigation.goBack();
      } else {
        navigation.navigate(draft.source === "saved" ? "SavedMeals" : "HistoryList");
      }
    } finally {
      setDeleting(false);
    }
  }, [deleteMeal, deleteSavedMeal, deleting, draft, navigation]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      allowNextBackRef.current = true;
      navigation.goBack();
    } else {
      navigation.navigate("SavedMeals");
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
